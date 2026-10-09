import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'vitest';
import assert from 'node:assert/strict';

const BINARY = join(import.meta.dirname, '..', '..', 'zaku-mcp', 'dist', 'zaku-mcp');
// The port the plugin's manifest admits; the binary listens on nothing else.
const BRIDGE = 'ws://127.0.0.1:7337';

// macOS scans a binary it has not run before, and a freshly compiled one took from under a second to past ten
// on its first launch; every wait below is counted from the first reply, never from the spawn.
const FIRST_REPLY_MS = 60_000;
// A later reply, a socket's answer, or an exit, once the binary is running.
const REPLY_MS = 10_000;
// The pairing test starts the binary twice, so its deadline holds two first replies and the work between.
const TEST_MS = 2 * FIRST_REPLY_MS + 60_000;

const INITIALIZE = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'e2e', version: '0' } },
};

const deadline = <T>(ms: number, what: string): Promise<T> =>
  new Promise((_, reject) => setTimeout(() => reject(new Error(`${what} took over ${ms} ms`)), ms));

/** The compiled binary over stdio, with its config directory where the test says. */
class Binary {
  private readonly child: ChildProcessWithoutNullStreams;
  /** Rejects when the binary cannot be spawned at all, such as when it was never built. */
  private readonly failed: Promise<never>;
  private readonly replies = new Map<number, (reply: unknown) => void>();
  private nextId = 2;
  private out = '';

  constructor(configHome: string) {
    this.child = spawn(BINARY, [], {
      cwd: mkdtempSync(join(tmpdir(), 'zaku-bin-')),
      env: { ...process.env, ZAKU_SKILLS_DIR: '', XDG_CONFIG_HOME: configHome },
    });
    this.failed = new Promise((_, reject) => this.child.once('error', reject));
    this.child.stdout.on('data', (chunk) => {
      this.out += chunk;
      const lines = this.out.split('\n');
      this.out = lines.pop() ?? '';
      for (const line of lines.filter(Boolean)) {
        const reply = JSON.parse(line) as { id?: number };
        if (reply.id !== undefined) this.replies.get(reply.id)?.(reply);
      }
    });
  }

  async start(): Promise<void> {
    await Promise.race([this.request(INITIALIZE, 1), this.failed, deadline(FIRST_REPLY_MS, 'the first reply')]);
    this.child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
  }

  /** The tool's text content, read as JSON. */
  async call(name: string, args: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const id = this.nextId++;
    const reply = (await Promise.race([
      this.request({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } }, id),
      deadline(REPLY_MS, `${name}`),
    ])) as { result: { content: { text: string }[] } };
    const [content] = reply.result.content;
    assert.ok(content);
    return JSON.parse(content.text) as Record<string, unknown>;
  }

  /** Closes stdin, the way a client ends its session, and answers the exit code. */
  async stop(): Promise<number | null> {
    const exited = new Promise<number | null>((resolve) => this.child.once('exit', (code) => resolve(code)));
    this.child.stdin.end();
    const code = await Promise.race([
      exited,
      new Promise<'alive'>((resolve) => setTimeout(() => resolve('alive'), 5000)),
    ]);
    if (code === 'alive') this.child.kill();
    return code === 'alive' ? null : code;
  }

  private request(message: object, id: number): Promise<unknown> {
    const reply = new Promise((resolve) => this.replies.set(id, resolve));
    this.child.stdin.write(`${JSON.stringify(message)}\n`);
    return reply;
  }
}

interface Heard {
  messages: { type: string; token?: string; reason?: string }[];
  closed: boolean;
  socket: WebSocket;
}

/** Dials the bridge, sends the first message, and answers what came back once the socket closed or paired. */
async function dial(first: object, quietMs = 1000): Promise<Heard> {
  const socket = new WebSocket(BRIDGE);
  const heard: Heard = { messages: [], closed: false, socket };
  const settled = new Promise<void>((resolve) => {
    socket.addEventListener('message', (event) => {
      heard.messages.push(JSON.parse(String(event.data)) as Heard['messages'][number]);
      if (heard.messages.at(-1)?.type === 'paired') resolve();
    });
    socket.addEventListener('close', () => {
      heard.closed = true;
      resolve();
    });
  });
  await Promise.race([
    new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve);
      socket.addEventListener('error', reject);
    }),
    deadline(REPLY_MS, 'the socket open'),
  ]);
  socket.send(JSON.stringify(first));
  await Promise.race([settled, new Promise((resolve) => setTimeout(resolve, quietMs))]);
  return heard;
}

const hello = (credential?: object): object => ({
  type: 'hello',
  file: 'e2e',
  pages: [],
  currentPage: '0:1',
  selection: [],
  pluginVersion: '0.1.0',
  user: null,
  ...(credential ? { credential } : {}),
});

const configHome = (): string => mkdtempSync(join(tmpdir(), 'zaku-config-'));

test(
  'the compiled zaku-mcp answers get_state over stdio',
  async () => {
    const binary = new Binary(configHome());
    try {
      await binary.start();
      const state = (await binary.call('get_state')) as { files: unknown[]; config: { loaded: boolean } };
      assert.deepEqual(state.files, []);
      assert.equal(state.config.loaded, false);
    } finally {
      await binary.stop();
    }
  },
  TEST_MS,
);

test(
  'the compiled zaku-mcp exits and frees its port when stdin closes',
  async () => {
    const binary = new Binary(configHome());
    await binary.start();
    assert.equal(await binary.stop(), 0);
  },
  TEST_MS,
);

test(
  'the compiled zaku-mcp admits a plugin after pair and its code, and the same plugin later by its token',
  async () => {
    const home = configHome();
    const first = new Binary(home);
    let token: string | undefined;
    try {
      await first.start();
      const { code } = (await first.call('pair')) as { code: string };
      const paired = await dial(hello({ code: code.replace(/\s/g, '') }));
      assert.equal(paired.messages[0]?.type, 'paired');
      token = paired.messages[0]?.token;
      assert.ok(token);
      assert.deepEqual(
        ((await first.call('get_state')) as { files: { file: string }[] }).files.map((f) => f.file),
        ['e2e'],
      );
      paired.socket.close();
    } finally {
      await first.stop();
    }
    const second = new Binary(home);
    try {
      await second.start();
      const again = await dial(hello({ token }));
      assert.deepEqual(again.messages, []);
      assert.equal(again.closed, false);
      assert.equal(((await second.call('get_state')) as { files: unknown[] }).files.length, 1);
      again.socket.close();
    } finally {
      await second.stop();
    }
  },
  TEST_MS,
);

test(
  'the compiled zaku-mcp refuses a socket with no credential and one with a token it never issued',
  async () => {
    const binary = new Binary(configHome());
    try {
      await binary.start();
      const bare = await dial(hello(), REPLY_MS);
      assert.deepEqual(bare.messages, []);
      assert.equal(bare.closed, true);
      const forged = await dial(hello({ token: 'forged' }), REPLY_MS);
      assert.deepEqual(forged.messages, [{ type: 'refused', reason: 'unknown-token' }]);
      assert.equal(forged.closed, true);
      assert.deepEqual(((await binary.call('get_state')) as { files: unknown[] }).files, []);
    } finally {
      await binary.stop();
    }
  },
  TEST_MS,
);
