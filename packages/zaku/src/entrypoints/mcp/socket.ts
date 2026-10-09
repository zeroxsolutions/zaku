import { WebSocketServer, type WebSocket } from 'ws';
import type { BridgeConnection, FigmaBridge } from '../../lib/adapters/figma-bridge.js';
import type { ServerMessage } from '../../lib/schema/bridge.js';

export type Listening = { port: number; close(): Promise<void> } | { error: string };

/** Figma's plugin iframe sends `Origin: null`; a local client sends none. A web page sends its own, and is refused. */
function admitted(origin: string | undefined): boolean {
  return origin === undefined || origin === 'null';
}

function connectionOf(socket: WebSocket): BridgeConnection {
  return {
    send: (message: ServerMessage) => socket.send(JSON.stringify(message)),
    onMessage: (listener) =>
      socket.on('message', (data) => {
        try {
          listener(JSON.parse(String(data)));
        } catch {
          // A frame that is not JSON is not a bridge message.
        }
      }),
    onClose: (listener) => socket.on('close', listener),
    isOpen: () => socket.readyState === socket.OPEN,
  };
}

export function listenBridge(bridge: FigmaBridge, port: number): Promise<Listening> {
  return new Promise((resolve) => {
    const server = new WebSocketServer({
      host: '127.0.0.1',
      port,
      verifyClient: (info: { origin: string | undefined }): boolean => admitted(info.origin || undefined),
    });
    server.once('error', (error: NodeJS.ErrnoException) =>
      resolve({ error: error.code === 'EADDRINUSE' ? `port ${port} is in use (another zaku-mcp?)` : error.message }),
    );
    server.once('listening', () => {
      server.on('connection', (socket) => bridge.attach(connectionOf(socket)));
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
