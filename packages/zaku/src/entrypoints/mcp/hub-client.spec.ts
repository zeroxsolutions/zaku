import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { startHubCore, type HubCore } from './hub.js';
import { runClient } from './hub-client.js';
import { listenHub, type HubServer } from './hub-server.js';

type Running = { core: HubCore; server: HubServer };
const hubs: Running[] = [];
afterEach(async () => {
  for (const { core, server } of hubs.splice(0)) {
    await server.close();
    await core.close();
  }
});

/** Starts a hub on the socket, as `zaku-mcp hub` would; a second one finds it taken and closes. */
async function startHub(dir: string, build: number): Promise<Running | null> {
  const core = await startHubCore({ skillsDir: '', ports: [0], pairingsFile: join(dir, 'pairings.json'), build });
  const running: { current: Running | null } = { current: null };
  const server = await listenHub(core, join(dir, 'hub.sock'), {
    onIdle: () => undefined,
    onHandover: () => {
      const index = hubs.findIndex((h) => h === running.current);
      if (index >= 0) hubs.splice(index, 1);
      const current = running.current;
      if (current) void current.server.close().then(() => core.close());
    },
  });
  if ('error' in server) {
    await core.close();
    return null;
  }
  running.current = { core, server };
  hubs.push(running.current);
  return running.current;
}

/** A client over in-memory stdio; `send` writes a line to its stdin, `next` reads its next stdout line. */
function client(
  dir: string,
  build: number,
  spawnHub: () => void,
): {
  done: Promise<number>;
  send: (m: object) => void;
  next: () => Promise<Record<string, unknown>>;
  end: () => void;
} {
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  let buffer = '';
  const queue: string[] = [];
  const waiting: ((l: string) => void)[] = [];
  stdout.on('data', (chunk) => {
    buffer += String(chunk);
    let i;
    while ((i = buffer.indexOf('\n')) >= 0) {
      const l = buffer.slice(0, i);
      buffer = buffer.slice(i + 1);
      const w = waiting.shift();
      if (w) w(l);
      else queue.push(l);
    }
  });
  const done = runClient({
    socketPath: join(dir, 'hub.sock'),
    build,
    cwd: '/work/a',
    designRoot: '/work/a/docs/design',
    spawnHub,
    stdin,
    stdout,
    connectMs: 3000,
  });
  return {
    done,
    send: (m) => void stdin.write(`${JSON.stringify(m)}\n`),
    next: async () =>
      JSON.parse(queue.shift() ?? (await new Promise<string>((r) => waiting.push(r)))) as Record<string, unknown>,
    end: () => void stdin.end(),
  };
}

const INITIALIZE = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'spec', version: '0' } },
};
const INITIALIZED = { jsonrpc: '2.0', method: 'notifications/initialized' };
const stateCall = (id: number): object => ({
  jsonrpc: '2.0',
  id,
  method: 'tools/call',
  params: { name: 'get_bridge_state', arguments: {} },
});

async function initialized(c: ReturnType<typeof client>): Promise<void> {
  c.send(INITIALIZE);
  expect(await c.next()).toMatchObject({ id: 1, result: { serverInfo: { name: 'zaku' } } });
  c.send(INITIALIZED);
}

describe('the hub client', () => {
  it('starts a hub when none answers, and pipes MCP to it until stdin ends', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'zc-'));
    let spawned = 0;
    const c = client(dir, 1, () => void (spawned++, startHub(dir, 1)));
    await initialized(c);
    c.send(stateCall(2));
    expect(await c.next()).toMatchObject({ id: 2, result: { structuredContent: { hub: { build: 1 } } } });
    expect(spawned).toBe(1);
    c.end();
    expect(await c.done).toBe(0);
  });

  it('starts a hub over a stale socket file a dead hub left', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'zc-'));
    await writeFile(join(dir, 'hub.sock'), '');
    const c = client(dir, 1, () => void startHub(dir, 1));
    await initialized(c);
    c.end();
    await c.done;
  });

  it('reaches one hub from two clients that each started one', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'zc-'));
    const spawn = (): void => void startHub(dir, 1);
    const a = client(dir, 1, spawn);
    const b = client(dir, 1, spawn);
    await Promise.all([initialized(a), initialized(b)]);
    expect(hubs).toHaveLength(1);
    a.end();
    b.end();
    await Promise.all([a.done, b.done]);
  });

  it('answers the next call after the hub died, replaying initialize to a new one, and fails the call in flight', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'zc-'));
    const c = client(dir, 1, () => void startHub(dir, 1));
    await initialized(c);
    const [first] = hubs;
    if (!first) throw new Error('no hub');
    c.send({ jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name: 'read_guide', arguments: { topic: 'x' } } });
    hubs.splice(0);
    await first.server.close();
    await first.core.close();
    const failed = await c.next();
    expect(failed).toMatchObject({ id: 9, error: { code: -32000 } });
    c.send(stateCall(3));
    expect(await c.next()).toMatchObject({ id: 3, result: { structuredContent: { hub: { build: 1 } } } });
    c.end();
    await c.done;
  });

  it('takes over a hub of an older build', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'zc-'));
    await startHub(dir, 1);
    const c = client(dir, 2, () => void startHub(dir, 2));
    await initialized(c);
    c.send(stateCall(2));
    expect(await c.next()).toMatchObject({ id: 2, result: { structuredContent: { hub: { build: 2 } } } });
    c.end();
    await c.done;
  });
});
