import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { mkdtemp } from 'node:fs/promises';
import { createServer, type AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import WebSocket from 'ws';
import type { ClientCapabilities } from '@modelcontextprotocol/sdk/types.js';
import { ElicitRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { ServerMessage } from '../../lib/schema/bridge.js';
import { fakePlugin, obedient, unboundCard, type Behaviour } from './fake-plugin.testing.js';
import { startMcp, type McpRuntime } from './main.js';

const open: { runtime: McpRuntime; sockets: WebSocket[] }[] = [];

/** A pushed message is sent without a reply, so the tool can answer before the plugin has it. */
async function until(condition: () => boolean | Promise<boolean>, ms = 2000): Promise<void> {
  const deadline = Date.now() + ms;
  while (!(await condition())) {
    if (Date.now() > deadline) throw new Error('condition not met in time');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

/** A port nothing listens on a moment ago: the system hands out a free one, and it is let go at once. */
async function freePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

/** A client over the runtime's own server; answers a tool's body. */
async function clientOf(runtime: McpRuntime): Promise<(name: string) => Promise<Record<string, unknown>>> {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await runtime.server.connect(serverSide);
  const client = new Client({ name: 'spec', version: '0' });
  await client.connect(clientSide);
  return async (name) => {
    const result = (await client.callTool({ name, arguments: {} })) as { content: { text: string }[] };
    return JSON.parse(result.content[0]?.text ?? 'null') as Record<string, unknown>;
  };
}

type Call = (
  name: string,
  args?: Record<string, unknown>,
) => Promise<{ error: boolean; body: Record<string, unknown> & { files?: unknown[]; text?: string } }>;
type PluginArgs = [file: string, behaviour: Behaviour, origin?: string];

/** What a socket heard before the server closed it, or before the wait ran out. */
interface Heard {
  messages: ServerMessage[];
  closed: boolean;
}

async function setup(
  timings = { timeoutMs: 200, holdMs: 400, readMs: 200 },
  options: { admitMs?: number; pairingsFile?: string; capabilities?: ClientCapabilities } = {},
): Promise<{
  runtime: McpRuntime;
  client: Client;
  call: Call;
  plugin: (...args: PluginArgs) => Promise<WebSocket>;
  newCode: () => Promise<string>;
  dial: (first: unknown, waitMs?: number) => Promise<Heard>;
  pairingsFile: string;
}> {
  const cwd = await mkdtemp(join(tmpdir(), 'zaku-mcp-'));
  const pairingsFile = options.pairingsFile ?? join(cwd, 'config', 'zaku', 'pairings.json');
  const runtime = await startMcp({
    cwd,
    env: {},
    skillsDir: join(cwd, 'skills'),
    ports: [0],
    timings,
    pairingsFile,
    admitMs: options.admitMs ?? 300,
  });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await runtime.server.connect(serverSide);
  const client = new Client({ name: 'spec', version: '0' }, { capabilities: options.capabilities ?? {} });
  await client.connect(clientSide);
  const entry = { runtime, sockets: [] as WebSocket[] };
  open.push(entry);
  const call: Call = async (name, args = {}) => {
    const result = (await client.callTool({ name, arguments: args })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };
    return { error: result.isError === true, body: JSON.parse(result.content[0]?.text ?? 'null') };
  };
  const newCode = async (): Promise<string> => String((await call('pair')).body['code']).replace(/\s/g, '');
  const plugin = async (...[file, behaviour, origin]: PluginArgs): Promise<WebSocket> => {
    const socket = await fakePlugin(runtime.port as number, file, { code: await newCode() }, behaviour, origin);
    entry.sockets.push(socket);
    await new Promise((resolve) => setTimeout(resolve, 20));
    return socket;
  };
  // Returns on the close, on a pairing, or once the wait runs out with the socket still open.
  const dial = async (first: unknown, waitMs = 500): Promise<Heard> => {
    const socket = new WebSocket(`ws://127.0.0.1:${runtime.port}`);
    entry.sockets.push(socket);
    const heard: Heard = { messages: [], closed: false };
    let settle: () => void = () => undefined;
    const settled = new Promise<void>((resolve) => (settle = resolve));
    socket.on('message', (data) => {
      const message = JSON.parse(String(data)) as ServerMessage;
      heard.messages.push(message);
      if (message.type === 'paired') settle();
    });
    socket.once('close', () => {
      heard.closed = true;
      settle();
    });
    await new Promise((resolve) => socket.once('open', resolve));
    if (first !== undefined) socket.send(JSON.stringify(first));
    await Promise.race([settled, new Promise((resolve) => setTimeout(resolve, waitMs))]);
    return heard;
  };
  return { runtime, client, call, plugin, newCode, dial, pairingsFile };
}

const hello = (credential: unknown): Record<string, unknown> => ({
  type: 'hello',
  file: 'Evil',
  pages: [],
  currentPage: '0:1',
  selection: [],
  pluginVersion: '0.1.0',
  user: null,
  ...(credential === undefined ? {} : { credential }),
});

afterEach(async () => {
  for (const { runtime, sockets } of open.splice(0)) {
    for (const socket of sockets) socket.terminate();
    await runtime.close();
  }
});

describe('zaku-mcp over a real socket', () => {
  it('lists the eight tools', async () => {
    const { runtime } = await setup();
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    await runtime.server.close();
    await runtime.server.connect(serverSide);
    const client = new Client({ name: 'spec', version: '0' });
    await client.connect(clientSide);
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual([
      'check',
      'execute',
      'get_state',
      'pair',
      'pairings',
      'read',
      'read_guide',
      'unpair',
    ]);
  });

  it('answers PluginNotConnected with no plugin open', async () => {
    const { call } = await setup();
    expect(await call('execute', { script: 'return 1' })).toEqual({
      error: true,
      body: {
        error:
          'PluginNotConnected: open zaku in Figma (Plugins > zaku); if its panel says Not paired, call pair and have the user type the code into it; if it says Not connected, have the user enter the port get_state reports',
      },
    });
  });

  it('reports the connected file in get_state', async () => {
    const { call, plugin } = await setup();
    await plugin('Ant Design', obedient([]));
    const { body } = await call('get_state');
    expect(body).toMatchObject({ files: [{ file: 'Ant Design' }], config: { loaded: false } });
    expect(body.files?.[0]).not.toHaveProperty('credential');
  });

  it('commits a clean run', async () => {
    const { call, plugin } = await setup();
    const log: ServerMessage[] = [];
    await plugin('A', obedient([], log));
    expect((await call('execute', { script: 'return 1' })).body).toMatchObject({ outcome: 'committed' });
    await until(() => log.length === 3);
    expect(log.map((m) => m.type)).toEqual(['run', 'decide', 'findings']);
  });

  it('rolls back a run with a finding', async () => {
    const { call, plugin } = await setup();
    await plugin('A', obedient([unboundCard]));
    expect((await call('execute', { script: 'return 1' })).body).toMatchObject({
      outcome: 'rolled-back',
      reason: 'findings',
      findings: [{ check: 'binding', field: 'fill' }],
    });
  });

  it('rolls back a thrown script', async () => {
    const { call, plugin } = await setup();
    await plugin('A', (m, send) => {
      if (m.type === 'run')
        send({ type: 'threw', runId: m.runId, error: 'TypeError: x is undefined', untouchable: [], left: [] });
    });
    expect((await call('execute', { script: 'x.y' })).body).toMatchObject({ outcome: 'rolled-back', reason: 'threw' });
  });

  it('times out a script the plugin never finishes, and does not call it rolled back unconfirmed', async () => {
    const { call, plugin } = await setup();
    const log: ServerMessage[] = [];
    await plugin('A', (m) => log.push(m));
    expect((await call('execute', { script: 'for(;;){}' })).body).toMatchObject({
      outcome: 'unknown',
      reason: 'timeout',
    });
    await until(() => log.length === 2);
    expect(log.at(-1)).toMatchObject({ type: 'decide', decision: 'rollback' });
  });

  it('answers unknown when the plugin drops between run and decision', async () => {
    const { call, plugin } = await setup();
    await plugin('A', (m, send, socket) => {
      if (m.type === 'run') {
        send({ type: 'ran', runId: m.runId, ok: true, value: 1, created: [], mutated: [], snapshot: [] });
        socket.terminate();
      }
    });
    expect((await call('execute', { script: 'return 1' })).body).toEqual({
      outcome: 'unknown',
      message: 'read before retrying',
    });
  });

  it('runs two executes on one file one after the other', async () => {
    const { call, plugin } = await setup({ timeoutMs: 1000, holdMs: 2000, readMs: 1000 });
    const order: string[] = [];
    await plugin('A', (m, send) => {
      if (m.type === 'run') {
        order.push(`run ${m.script}`);
        setTimeout(
          () =>
            send({ type: 'ran', runId: m.runId, ok: true, value: m.script, created: [], mutated: [], snapshot: [] }),
          50,
        );
      }
      if (m.type === 'decide') {
        order.push(`decide ${m.runId}`);
        send({ type: 'settled', runId: m.runId, outcome: 'committed', untouchable: [], left: [] });
      }
    });
    await Promise.all([call('execute', { script: 'return 1' }), call('execute', { script: 'return 2' })]);
    expect(order.map((line) => line.split(' ')[0])).toEqual(['run', 'decide', 'run', 'decide']);
  });

  it('refuses a connection from a web origin', async () => {
    const { runtime } = await setup();
    const socket = new WebSocket(`ws://127.0.0.1:${runtime.port}`, { origin: 'https://evil.example' });
    const outcome = await new Promise<string>((resolve) => {
      socket.once('open', () => resolve('open'));
      socket.once('error', () => resolve('refused'));
      socket.once('unexpected-response', () => resolve('refused'));
    });
    expect(outcome).toBe('refused');
  });

  it('admits the null origin Figma sends', async () => {
    const { call, plugin } = await setup();
    await plugin('A', obedient([]), 'null');
    expect((await call('get_state')).body.files).toHaveLength(1);
  });

  it('listens on the first free port of those it tries, and reports it in get_state and pair', async () => {
    const taken = await setup();
    const free = await freePort();
    const cwd = await mkdtemp(join(tmpdir(), 'zaku-mcp-'));
    const runtime = await startMcp({
      cwd,
      env: {},
      skillsDir: cwd,
      ports: [taken.runtime.port as number, free],
      pairingsFile: join(cwd, 'pairings.json'),
    });
    open.push({ runtime, sockets: [] });
    expect(runtime.port).toBe(free);
    expect(runtime.portError).toBeNull();
    const call = await clientOf(runtime);
    expect(await call('get_state')).toMatchObject({ port: free, portError: null });
    expect(await call('pair')).toMatchObject({ port: free });
  });

  it('answers get_state when every port it tries is taken, naming the range', async () => {
    const first = await setup();
    const second = await setup();
    const ports = [first.runtime.port as number, second.runtime.port as number].sort((a, b) => a - b);
    const cwd = await mkdtemp(join(tmpdir(), 'zaku-mcp-'));
    const runtime = await startMcp({
      cwd,
      env: {},
      skillsDir: cwd,
      ports,
      pairingsFile: join(cwd, 'pairings.json'),
    });
    open.push({ runtime, sockets: [] });
    expect(runtime.port).toBeNull();
    expect(runtime.portError).toBe(`no free port in ${ports[0]}-${ports[1]} (another zaku-mcp on each?)`);
    expect(await (await clientOf(runtime))('get_state')).toMatchObject({ port: null });
  });

  it('names the taken port when no plugin is connected, and listens once the port frees up', async () => {
    const first = await setup();
    const taken = first.runtime.port as number;
    const cwd = await mkdtemp(join(tmpdir(), 'zaku-mcp-'));
    const second = await startMcp({
      cwd,
      env: {},
      skillsDir: cwd,
      ports: [taken],
      retryListenMs: 20,
      pairingsFile: join(cwd, 'pairings.json'),
    });
    open.push({ runtime: second, sockets: [] });
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    await second.server.connect(serverSide);
    const client = new Client({ name: 'spec', version: '0' });
    await client.connect(clientSide);
    const refused = (await client.callTool({ name: 'execute', arguments: { script: 'return 1' } })) as {
      content: { text: string }[];
    };
    expect(JSON.parse(refused.content[0]?.text ?? 'null').error).toContain(`port ${taken} is in use`);
    await first.runtime.close();
    open.splice(open.indexOf(open.find((entry) => entry.runtime === first.runtime) as (typeof open)[number]), 1);
    await until(() => second.port === taken);
    expect(second.portError).toBeNull();
  });

  it('reads a guide, and lists the topics for one it does not have', async () => {
    const { call } = await setup();
    expect((await call('read_guide', { topic: 'binding' })).body.text).toContain('Why');
    expect(await call('read_guide', { topic: 'nope' })).toMatchObject({ error: true });
  });

  it('checks the current page and pushes the findings', async () => {
    const { call, plugin } = await setup();
    const log: ServerMessage[] = [];
    await plugin('A', obedient([unboundCard], log));
    expect((await call('check', { scope: 'page' })).body).toMatchObject({ findings: [{ check: 'binding' }] });
    await until(() => log.length === 2);
    expect(log.map((m) => m.type)).toEqual(['snapshot', 'findings']);
  });

  it('checks the page when the plugin asks, and pushes the findings', async () => {
    const { plugin } = await setup();
    const log: ServerMessage[] = [];
    const socket = await plugin('A', obedient([unboundCard], log));
    socket.send(JSON.stringify({ type: 'check', scope: { page: true } }));
    await until(() => log.length === 2);
    expect(log.map((m) => m.type)).toEqual(['snapshot', 'findings']);
    expect(log[1]).toMatchObject({ findings: [{ check: 'binding' }] });
  });

  it('waits for a running execute before a panel check snapshots the page', async () => {
    const { call, plugin } = await setup();
    const log: ServerMessage[] = [];
    const answer = obedient([unboundCard]);
    await plugin('A', (message, send, socket) => {
      log.push(message);
      if (message.type !== 'run') return answer(message, send, socket);
      socket.send(JSON.stringify({ type: 'check', scope: { page: true } }));
      setTimeout(() => answer(message, send, socket), 50);
    });
    await call('execute', { script: 'return 1', mode: 'report' });
    await until(() => log.length === 5);
    expect(log.map((m) => m.type)).toEqual(['run', 'decide', 'findings', 'snapshot', 'findings']);
  });

  it('closes a socket whose first message presents no credential, and sends it nothing', async () => {
    const { call, dial } = await setup();
    expect(await dial(hello(undefined))).toEqual({ messages: [], closed: true });
    expect(await dial({ type: 'check', scope: { page: true } })).toEqual({ messages: [], closed: true });
    expect((await call('get_state')).body.files).toEqual([]);
  });

  it('closes a socket that says nothing within the admission window', async () => {
    const { dial } = await setup(undefined, { admitMs: 50 });
    expect(await dial(undefined, 1000)).toEqual({ messages: [], closed: true });
  });

  it('pairs a socket that presents the code pair showed, and hands it a token', async () => {
    const { call, dial, newCode } = await setup();
    const heard = await dial(hello({ code: await newCode() }));
    expect(heard).toEqual({ messages: [{ type: 'paired', token: expect.any(String) }], closed: false });
    const paired = heard.messages[0] as { token: string };
    expect(Buffer.from(paired.token, 'base64url').length).toBeGreaterThanOrEqual(16);
    expect((await call('get_state')).body.files).toMatchObject([{ file: 'Evil' }]);
    expect((await call('pairings')).body).toMatchObject({ pairings: [{ id: expect.any(String), file: 'Evil' }] });
  });

  it('admits a later socket by its token alone, and refuses a token it never issued', async () => {
    const { call, dial, newCode } = await setup();
    const first = await dial(hello({ code: await newCode() }));
    const { token } = first.messages[0] as { token: string };
    expect(await dial(hello({ token }))).toEqual({ messages: [], closed: false });
    expect((await call('get_state')).body.files).toHaveLength(2);
    expect(await dial(hello({ token: 'forged' }))).toEqual({
      messages: [{ type: 'refused', reason: 'unknown-token' }],
      closed: true,
    });
  });

  it('refuses a wrong code and closes, and says the code is used up after five', async () => {
    const { call, dial, newCode } = await setup();
    const code = await newCode();
    const wrong = code === '00000000' ? '11111111' : '00000000';
    for (let i = 0; i < 4; i++)
      expect(await dial(hello({ code: wrong }))).toEqual({
        messages: [{ type: 'refused', reason: 'wrong-code' }],
        closed: true,
      });
    expect((await dial(hello({ code: wrong }))).messages).toEqual([{ type: 'refused', reason: 'used-up-code' }]);
    expect((await dial(hello({ code }))).messages).toEqual([{ type: 'refused', reason: 'used-up-code' }]);
    expect((await call('get_state')).body).toMatchObject({
      files: [],
      pairing: {
        state: 'used-up',
        message: 'This code was used up by wrong attempts. Ask your agent for a new one.',
      },
    });
  });

  it('revokes a pairing by id, closing its socket and refusing its token after', async () => {
    const { call, dial, newCode } = await setup();
    const { token } = (await dial(hello({ code: await newCode() }))).messages[0] as { token: string };
    const { body } = await call('pairings');
    const [{ id }] = body['pairings'] as [{ id: string }];
    expect((await call('unpair', { id })).body).toEqual({ revoked: 1 });
    await until(async () => (await call('get_state')).body.files?.length === 0);
    expect((await dial(hello({ token }))).messages).toEqual([{ type: 'refused', reason: 'unknown-token' }]);
    expect(await call('unpair', { id })).toMatchObject({ error: true });
  });

  it('revokes every pairing with all', async () => {
    const { call, dial, newCode } = await setup();
    await dial(hello({ code: await newCode() }));
    await dial(hello({ code: await newCode() }));
    expect((await call('unpair', { id: 'all' })).body).toEqual({ revoked: 2 });
    expect((await call('pairings')).body).toMatchObject({ pairings: [] });
  });

  it('forgets the token of a panel that asks to unpair, and closes it', async () => {
    const { call, runtime, newCode } = await setup();
    const socket = await fakePlugin(runtime.port as number, 'A', { code: await newCode() }, () => undefined);
    const closed = new Promise((resolve) => socket.once('close', resolve));
    await new Promise((resolve) => setTimeout(resolve, 20));
    socket.send(JSON.stringify({ type: 'unpair' }));
    await closed;
    expect((await call('pairings')).body).toMatchObject({ pairings: [] });
  });

  it('keeps a pairing across a restart, in the pairings file', async () => {
    const first = await setup();
    const { token } = (await first.dial(hello({ code: await first.newCode() }))).messages[0] as { token: string };
    const second = await setup(undefined, { pairingsFile: first.pairingsFile });
    expect(await second.dial(hello({ token }))).toEqual({ messages: [], closed: false });
  });

  it('shows the code in the tool result to a client without elicitation', async () => {
    const { call } = await setup();
    const { body } = await call('pair');
    expect(body['code']).toMatch(/^\d{4} \d{4}$/);
    expect(body['expiresAt']).toEqual(expect.any(String));
  });

  it('shows the code in an elicitation dialog, and keeps it out of the tool result', async () => {
    const { client, call, dial } = await setup(undefined, { capabilities: { elicitation: { form: {} } } });
    const shown: string[] = [];
    client.setRequestHandler(ElicitRequestSchema, (request) => {
      shown.push(request.params.message);
      return { action: 'accept', content: {} };
    });
    const { body } = await call('pair');
    expect(body).not.toHaveProperty('code');
    const code = /(\d{4}) (\d{4})/.exec(shown[0] ?? '');
    expect(code).not.toBeNull();
    expect((await dial(hello({ code: `${code?.[1]}${code?.[2]}` }))).messages).toMatchObject([{ type: 'paired' }]);
  });
});
