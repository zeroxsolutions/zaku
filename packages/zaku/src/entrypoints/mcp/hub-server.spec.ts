import { mkdtemp, writeFile } from 'node:fs/promises';
import { connect, type Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startHubCore, type HubCore } from './hub.js';
import { listenHub, type HubServer } from './hub-server.js';

const opened: (HubCore | HubServer)[] = [];
afterEach(async () => {
  for (const item of opened.splice(0).reverse()) await item.close();
});

/** A socket that reads the hub's lines one by one. */
async function line(
  socketPath: string,
): Promise<{ socket: Socket; next: () => Promise<Record<string, unknown>>; send: (m: object) => void }> {
  const socket = connect(socketPath);
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('error', reject);
  });
  let buffer = '';
  const queue: string[] = [];
  const waiting: ((l: string) => void)[] = [];
  socket.on('data', (chunk) => {
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
  return {
    socket,
    next: async (): Promise<Record<string, unknown>> => {
      const l = queue.shift() ?? (await new Promise<string>((resolve) => waiting.push(resolve)));
      return JSON.parse(l) as Record<string, unknown>;
    },
    send: (m: object): void => void socket.write(`${JSON.stringify(m)}\n`),
  };
}

async function core(build = 5): Promise<{ core: HubCore; dir: string }> {
  const dir = await mkdtemp(join(tmpdir(), 'zh-'));
  const hub = await startHubCore({ skillsDir: '', ports: [0], pairingsFile: join(dir, 'pairings.json'), build });
  opened.push(hub);
  return { core: hub, dir };
}

const clientHello = (build: number, handover?: boolean): object => ({
  type: 'client',
  cwd: '/work/a',
  designRoot: '/work/a/docs/design',
  build,
  ...(handover ? { handover } : {}),
});
const INITIALIZE = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'spec', version: '0' } },
};

describe('the hub server', () => {
  it("answers a client's hello with its own, then serves MCP over the same socket", async () => {
    const { core: hub, dir } = await core();
    const path = join(dir, 'hub.sock');
    const server = await listenHub(async () => hub, path, { onIdle: () => undefined, onHandover: () => undefined });
    if ('error' in server) throw new Error('taken');
    opened.push(server);
    const client = await line(path);
    client.send(clientHello(5));
    expect(await client.next()).toMatchObject({ type: 'hub', build: 5 });
    client.send(INITIALIZE);
    expect(await client.next()).toMatchObject({ id: 1, result: { serverInfo: { name: 'zaku' } } });
    client.socket.destroy();
  });

  it('goes idle once the last client leaves, and not while one is connected', async () => {
    const { core: hub, dir } = await core();
    const path = join(dir, 'hub.sock');
    let idle = 0;
    const server = await listenHub(async () => hub, path, {
      idleMs: 60,
      onIdle: () => idle++,
      onHandover: () => undefined,
    });
    if ('error' in server) throw new Error('taken');
    opened.push(server);
    const client = await line(path);
    client.send(clientHello(5));
    await client.next();
    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(idle).toBe(0);
    client.socket.destroy();
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(idle).toBe(1);
  });

  it('stays up while a panel is connected after the last client left, and goes idle once it leaves', async () => {
    const { core: hub, dir } = await core();
    let idle = 0;
    const server = await listenHub(async () => hub, join(dir, 'hub.sock'), {
      idleMs: 60,
      onIdle: () => idle++,
      onHandover: () => undefined,
    });
    if ('error' in server) throw new Error('taken');
    opened.push(server);
    let close: () => void = () => undefined;
    hub.bridge.attach({
      send: () => undefined,
      onMessage: () => undefined,
      onClose: (listener) => (close = listener),
      isOpen: () => true,
    });
    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(idle).toBe(0);
    close();
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(idle).toBe(1);
  });

  it('answers taken on a socket a live hub holds, and replaces a stale socket file', async () => {
    const { core: hub, dir } = await core();
    const path = join(dir, 'hub.sock');
    const first = await listenHub(async () => hub, path, { onIdle: () => undefined, onHandover: () => undefined });
    if ('error' in first) throw new Error('taken');
    opened.push(first);
    // A hub that loses the socket must not have taken a panel port first.
    let started = 0;
    const second = async (): Promise<HubCore> => {
      started++;
      return hub;
    };
    expect(await listenHub(second, path, { onIdle: () => undefined, onHandover: () => undefined })).toEqual({
      error: 'taken',
    });
    expect(started).toBe(0);
    const stale = join(dir, 'stale.sock');
    await writeFile(stale, '');
    const replaced = await listenHub(async () => hub, stale, { onIdle: () => undefined, onHandover: () => undefined });
    expect('error' in replaced).toBe(false);
    if (!('error' in replaced)) opened.push(replaced);
  });

  it('hands over to a newer client once nothing runs, and ignores an older one', async () => {
    const { core: hub, dir } = await core(5);
    const path = join(dir, 'hub.sock');
    let handovers = 0;
    const server = await listenHub(async () => hub, path, { onIdle: () => undefined, onHandover: () => handovers++ });
    if ('error' in server) throw new Error('taken');
    opened.push(server);
    const older = await line(path);
    older.send(clientHello(4, true));
    expect(await older.next()).toMatchObject({ type: 'hub', build: 5 });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(handovers).toBe(0);
    const newer = await line(path);
    newer.send(clientHello(6, true));
    expect(await newer.next()).toMatchObject({ type: 'hub', handingOver: true });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(handovers).toBe(1);
    older.socket.destroy();
    newer.socket.destroy();
  });
});
