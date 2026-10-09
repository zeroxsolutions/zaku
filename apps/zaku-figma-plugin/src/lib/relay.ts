import type { PluginMessage } from '@zeroxsolutions/zaku/schema';

export interface SocketLike {
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  readyState: number;
  send(data: string): void;
}

/** Disconnected until the first open, and again once the redial delay has reached its cap. */
export type RelayStatus = 'connected' | 'reconnecting' | 'disconnected';

export interface RelayOptions {
  url: string;
  post: (message: unknown) => void;
  listen: (callback: (message: unknown) => void) => void;
  open: (url: string) => SocketLike;
  schedule: (fn: () => void, ms: number) => void;
  onStatus: (status: RelayStatus) => void;
}

export interface Relay {
  /** Sends the panel's own message to zaku-mcp; dropped while the socket is closed. */
  send(message: PluginMessage): void;
}

const FIRST_DELAY = 500;
const LAST_DELAY = 10_000;
const OPEN = 1;

/** Carries messages between the sandbox and zaku-mcp, and redials after a drop. */
export function startRelay(options: RelayOptions): Relay {
  let socket: SocketLike;
  let delay = FIRST_DELAY;
  let everOpened = false;
  const send = (message: unknown): void => {
    if (socket.readyState === OPEN) socket.send(JSON.stringify(message));
  };
  options.listen(send);
  const dial = (): void => {
    socket = options.open(options.url);
    socket.onopen = (): void => {
      delay = FIRST_DELAY;
      everOpened = true;
      options.onStatus('connected');
      options.post({ type: 'connected' });
    };
    socket.onmessage = (event): void => {
      try {
        options.post(JSON.parse(event.data));
      } catch {
        // not a bridge message
      }
    };
    socket.onclose = (): void => {
      options.onStatus(everOpened && delay < LAST_DELAY ? 'reconnecting' : 'disconnected');
      options.schedule(dial, delay);
      delay = Math.min(delay * 2, LAST_DELAY);
    };
  };
  options.onStatus('disconnected');
  dial();
  return { send };
}
