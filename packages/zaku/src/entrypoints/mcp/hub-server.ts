import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { randomUUID } from 'node:crypto';
import { chmod, mkdir, rm } from 'node:fs/promises';
import { connect, createServer, type Socket } from 'node:net';
import { dirname } from 'node:path';
import type { HubCore } from './hub.js';
import { clientHelloSchema, HUB_IDLE_MS, type ClientHello, type HubHello } from './hub-protocol.js';

export interface HubServer {
  readonly core: HubCore;
  close(): Promise<void>;
}

export interface HubServerOptions {
  idleMs?: number;
  /** The last client left `idleMs` ago. */
  onIdle: () => void;
  /** A newer client asked for the hub and nothing runs; the caller closes and exits. */
  onHandover: () => void;
}

/** Whether a hub answers on the socket; a file nothing listens on is left by a hub that died. */
function answers(socketPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = connect(socketPath);
    probe.once('connect', () => {
      probe.destroy();
      resolve(true);
    });
    probe.once('error', () => resolve(false));
  });
}

/** Reads the first line, and puts back whatever followed it for the transport. */
function firstLine(socket: Socket): Promise<string | null> {
  return new Promise((resolve) => {
    let buffer = Buffer.alloc(0);
    const onData = (chunk: Buffer): void => {
      buffer = Buffer.concat([buffer, chunk]);
      const end = buffer.indexOf('\n');
      if (end < 0) return;
      socket.off('data', onData);
      socket.off('close', onClose);
      socket.pause();
      const rest = buffer.subarray(end + 1);
      if (rest.length > 0) socket.unshift(rest);
      resolve(buffer.subarray(0, end).toString('utf8'));
    };
    const onClose = (): void => resolve(null);
    socket.on('data', onData);
    socket.once('close', onClose);
  });
}

const parse = (line: string): ClientHello | null => {
  try {
    const parsed = clientHelloSchema.safeParse(JSON.parse(line));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

/**
 * Serves each client that connects to the socket its own tools over the core. Answers taken when a live hub holds
 * the socket, which is how the second of two hubs started together learns to exit.
 */
export async function listenHub(
  start: () => Promise<HubCore>,
  socketPath: string,
  options: HubServerOptions,
): Promise<HubServer | { error: 'taken' }> {
  await mkdir(dirname(socketPath), { recursive: true, mode: 0o700 });
  await chmod(dirname(socketPath), 0o700);
  const idleMs = options.idleMs ?? HUB_IDLE_MS;
  const clients = new Set<Socket>();
  let idle: NodeJS.Timeout | undefined;
  let handingOver = false;
  let resolveCore: (core: HubCore) => void = () => undefined;
  const ready = new Promise<HubCore>((resolve) => (resolveCore = resolve));
  const armIdle = (): void => {
    clearTimeout(idle);
    if (clients.size === 0) idle = setTimeout(options.onIdle, idleMs);
  };
  const server = createServer((socket) => {
    clients.add(socket);
    clearTimeout(idle);
    socket.once('close', () => {
      clients.delete(socket);
      armIdle();
    });
    socket.on('error', () => socket.destroy());
    void firstLine(socket).then(async (line): Promise<void> => {
      const core = await ready;
      const hello = line === null ? null : parse(line);
      if (hello === null) {
        socket.destroy();
        return;
      }
      const handover = hello.handover === true && hello.build > core.build;
      const reply: HubHello = {
        type: 'hub',
        build: core.build,
        port: core.port,
        ...(handover ? { handingOver: true } : {}),
      };
      socket.write(`${JSON.stringify(reply)}\n`);
      if (handover) {
        if (handingOver) return;
        handingOver = true;
        await core.bridge.idle();
        options.onHandover();
        return;
      }
      const client = { id: randomUUID(), cwd: hello.cwd, designRoot: hello.designRoot };
      const mcp = core.serve(client);
      socket.once('close', () => void mcp.close());
      await mcp.connect(new StdioServerTransport(socket, socket));
      socket.resume();
    });
  });
  const bind = (): Promise<NodeJS.ErrnoException | null> =>
    new Promise((resolve) => {
      server.once('error', resolve);
      server.listen(socketPath, () => {
        server.off('error', resolve);
        resolve(null);
      });
    });
  // Binding first lets the second of two hubs started together see the first one's socket in use.
  let failed = await bind();
  if (failed?.code === 'EADDRINUSE') {
    if (await answers(socketPath)) return { error: 'taken' };
    // A hub that died left the file; nothing listens on it.
    await rm(socketPath, { force: true });
    failed = await bind();
  }
  if (failed) return { error: 'taken' };
  // The panel port is opened only once the socket is this hub's, so a hub that loses the race never holds one.
  const core = await start();
  resolveCore(core);
  armIdle();
  return {
    core,
    close: (): Promise<void> =>
      new Promise((done) => {
        clearTimeout(idle);
        for (const socket of clients) socket.destroy();
        server.close(() => done());
      }),
  };
}
