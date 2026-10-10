import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'vitest';
import assert from 'node:assert/strict';

const BINARY = join(import.meta.dirname, '..', '..', 'zaku-mcp', 'dist', 'zaku-mcp');
// The ports the plugin's manifest admits; another session's zaku-mcp may hold any of them while this suite runs.
// A Figma panel open meanwhile can dial the binary this suite starts and have its token refused. Keeping the suite
// off the range would take a way for the shipped binary to listen outside it, which then reaches every user who
// sets it by mistake, where the panel can never dial it; so the panel keeps a refused token and tries the other ports.
const RANGE = [7337, 7338, 7339, 7340, 7341, 7342, 7343, 7344, 7345, 7346];

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

  /** stderr as the binary wrote it. */
  err = '';

  /** `port` becomes ZAKU_PORT; null leaves it unset, so the binary takes the first free port in the range. */
  constructor(configHome: string, port: number | string | null) {
    const env: NodeJS.ProcessEnv = { ...process.env, ZAKU_SKILLS_DIR: '', XDG_CONFIG_HOME: configHome };
    delete env['ZAKU_PORT'];
    if (port !== null) env['ZAKU_PORT'] = String(port);
    this.child = spawn(BINARY, [], { cwd: mkdtempSync(join(tmpdir(), 'zaku-bin-')), env });
    this.child.stderr.on('data', (chunk) => (this.err += chunk));
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

  /** The exit code of a binary that stops on its own, such as one refusing its environment. */
  exited(): Promise<number | null> {
    return Promise.race([
      new Promise<number | null>((resolve) => this.child.once('exit', (code) => resolve(code))),
      this.failed,
      deadline<number | null>(FIRST_REPLY_MS, 'the exit'),
    ]);
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

/** Dials the bridge on `port`, sends the first message, and answers what came back once the socket closed or paired. */
async function dial(port: number, first: object, quietMs = 1000): Promise<Heard> {
  const socket = new WebSocket(`ws://127.0.0.1:${port}`);
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

/** Whether nothing holds `port` on loopback; the probe lets go of it at once. */
const isFree = (port: number): Promise<boolean> =>
  new Promise((resolve) => {
    const probe = createServer();
    probe.once('error', () => resolve(false));
    probe.listen(port, '127.0.0.1', () => probe.close(() => resolve(true)));
  });

/** The first port of the range nothing holds now. */
async function firstFree(): Promise<number> {
  for (const port of RANGE) if (await isFree(port)) return port;
  throw new Error(`every port in ${RANGE[0]}-${RANGE.at(-1)} is held; stop a zaku-mcp and run again`);
}

test(
  'the compiled zaku-mcp answers get_bridge_state over stdio, naming the first free port in the range it took',
  async () => {
    const expected = await firstFree();
    const binary = new Binary(configHome(), null);
    try {
      await binary.start();
      const state = (await binary.call('get_bridge_state')) as {
        files: unknown[];
        config: { loaded: boolean };
        port: number | null;
      };
      assert.deepEqual(state.files, []);
      assert.equal(state.config.loaded, false);
      assert.equal(state.port, expected);
    } finally {
      await binary.stop();
    }
  },
  TEST_MS,
);

test(
  'the compiled zaku-mcp exits and frees its port when stdin closes',
  async () => {
    const binary = new Binary(configHome(), await firstFree());
    await binary.start();
    assert.equal(await binary.stop(), 0);
  },
  TEST_MS,
);

test(
  'the compiled zaku-mcp admits a plugin after pair and its code, and the same plugin later by its token',
  async () => {
    const home = configHome();
    const port = await firstFree();
    const first = new Binary(home, port);
    let token: string | undefined;
    try {
      await first.start();
      const pair = (await first.call('issue_pairing_code')) as { code: string; port: number };
      assert.equal(pair.port, port);
      const paired = await dial(port, hello({ code: pair.code.replace(/\s/g, '') }));
      assert.equal(paired.messages[0]?.type, 'paired');
      token = paired.messages[0]?.token;
      assert.ok(token);
      assert.deepEqual(
        ((await first.call('get_bridge_state')) as { files: { file: string }[] }).files.map((f) => f.file),
        ['e2e'],
      );
      paired.socket.close();
    } finally {
      await first.stop();
    }
    const second = new Binary(home, port);
    try {
      await second.start();
      const again = await dial(port, hello({ token }));
      assert.deepEqual(again.messages, []);
      assert.equal(again.closed, false);
      assert.equal(((await second.call('get_bridge_state')) as { files: unknown[] }).files.length, 1);
      again.socket.close();
    } finally {
      await second.stop();
    }
  },
  TEST_MS,
);

test(
  'the compiled zaku-mcp refuses a socket with no credential, one with a token it never issued, and a ZAKU_PORT outside the range',
  async () => {
    const outside = new Binary(configHome(), 9000);
    assert.equal(await outside.exited(), 1);
    assert.match(outside.err, /ZAKU_PORT=9000 .*7337-7346/);
    const port = await firstFree();
    const binary = new Binary(configHome(), port);
    try {
      await binary.start();
      const bare = await dial(port, hello(), REPLY_MS);
      assert.deepEqual(bare.messages, []);
      assert.equal(bare.closed, true);
      const forged = await dial(port, hello({ token: 'forged' }), REPLY_MS);
      assert.deepEqual(forged.messages, [{ type: 'refused', reason: 'unknown-token' }]);
      assert.equal(forged.closed, true);
      assert.deepEqual(((await binary.call('get_bridge_state')) as { files: unknown[] }).files, []);
    } finally {
      await binary.stop();
    }
  },
  TEST_MS,
);
