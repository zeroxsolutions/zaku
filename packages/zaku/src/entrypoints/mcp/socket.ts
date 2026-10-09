import { WebSocketServer, type WebSocket } from 'ws';
import type { BridgeConnection, FigmaBridge } from '../../lib/adapters/figma-bridge.js';
import { helloSchema, type ServerMessage } from '../../lib/schema/bridge.js';
import type { Pairings } from './pairings.js';

export type Listening = { port: number; close(): Promise<void> } | { error: string };

/** How long a connection may stay open without presenting a valid credential. */
export const ADMIT_MS = 5_000;

/** What `listenBridge` answers for a port another process holds; `listenFirstFree` names the ports instead. */
const IN_USE = 'in use';

/** Figma's plugin iframe sends `Origin: null`; a local client sends none. A web page sends its own, and is refused. */
function admitted(origin: string | undefined): boolean {
  return origin === undefined || origin === 'null';
}

const parse = (data: unknown): unknown => {
  try {
    return JSON.parse(String(data));
  } catch {
    return undefined;
  }
};

/** The connection the bridge sees; its first listener hears the hello the admission already read. */
function connectionOf(socket: WebSocket, first: unknown): BridgeConnection {
  return {
    send: (message: ServerMessage) => socket.send(JSON.stringify(message)),
    onMessage: (listener): void => {
      listener(first);
      socket.on('message', (data) => {
        const message = parse(data);
        // A frame that is not JSON is not a bridge message.
        if (message !== undefined) listener(message);
      });
    },
    onClose: (listener) => socket.on('close', listener),
    isOpen: () => socket.readyState === socket.OPEN,
  };
}

/**
 * A sandboxed iframe on any web page also sends `Origin: null`, so the Origin rule cannot tell it from
 * the plugin. The first message has to carry a code or a token; until it does, the server sends the
 * connection nothing and the bridge does not know it exists.
 */
function admit(socket: WebSocket, bridge: FigmaBridge, pairings: Pairings, admitMs: number): void {
  const deadline = setTimeout(() => socket.close(), admitMs);
  const first = async (data: unknown): Promise<void> => {
    const hello = helloSchema.safeParse(parse(data));
    if (!hello.success) {
      socket.close();
      return;
    }
    const admission = await pairings.admit(hello.data.credential, hello.data.file);
    if (socket.readyState !== socket.OPEN) return;
    if (admission.kind === 'refused') {
      socket.send(JSON.stringify({ type: 'refused', reason: admission.reason } satisfies ServerMessage));
      socket.close();
      return;
    }
    clearTimeout(deadline);
    const { id } = admission.pairing;
    const untrack = pairings.track(id, () => socket.close());
    socket.on('close', untrack);
    socket.on('message', (raw) => {
      const message = parse(raw) as { type?: unknown } | undefined;
      if (message?.type === 'unpair') void pairings.revoke(id).catch(() => socket.close());
    });
    if (admission.issued !== null)
      socket.send(JSON.stringify({ type: 'paired', token: admission.issued } satisfies ServerMessage));
    bridge.attach(connectionOf(socket, hello.data));
  };
  // The pairings file could not be read or written; the plugin dials again.
  socket.once('message', (data) => void first(data).catch(() => socket.close()));
  socket.on('close', () => clearTimeout(deadline));
}

/**
 * Listens on the first of `ports` no other process holds. The error names the one port when there is one,
 * and the range when every port of several is taken.
 */
export async function listenFirstFree(
  bridge: FigmaBridge,
  pairings: Pairings,
  ports: readonly number[],
  admitMs: number = ADMIT_MS,
): Promise<Listening> {
  for (const port of ports) {
    const listening = await listenBridge(bridge, pairings, port, admitMs);
    if (!('error' in listening) || listening.error !== IN_USE) return listening;
  }
  const [first] = ports;
  const last = ports[ports.length - 1];
  return {
    error:
      ports.length === 1
        ? `port ${first} is in use (another zaku-mcp?)`
        : `no free port in ${first}-${last} (another zaku-mcp on each?)`,
  };
}

/** Listens on one port; the error is `IN_USE` when another process holds it. */
function listenBridge(
  bridge: FigmaBridge,
  pairings: Pairings,
  port: number,
  admitMs: number = ADMIT_MS,
): Promise<Listening> {
  return new Promise((resolve) => {
    const server = new WebSocketServer({
      host: '127.0.0.1',
      port,
      verifyClient: (info: { origin: string | undefined }): boolean => admitted(info.origin || undefined),
    });
    server.once('error', (error: NodeJS.ErrnoException) =>
      resolve({ error: error.code === 'EADDRINUSE' ? IN_USE : error.message }),
    );
    server.once('listening', () => {
      server.on('connection', (socket) => admit(socket, bridge, pairings, admitMs));
      const address = server.address();
      resolve({
        port: typeof address === 'object' && address ? address.port : port,
        close: (): Promise<void> =>
          new Promise<void>((done) => {
            for (const client of server.clients) client.terminate();
            server.close(() => done());
          }),
      });
    });
  });
}
