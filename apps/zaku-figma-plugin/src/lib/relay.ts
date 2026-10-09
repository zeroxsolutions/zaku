import { fileHelloSchema, serverMessageSchema, type Credential, type PluginMessage } from '@zeroxsolutions/zaku/schema';

export interface SocketLike {
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  readyState: number;
  send(data: string): void;
  close(): void;
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
  /** Dials with the code the user typed, digits only; the token the server answers with replaces it. */
  pair(code: string): void;
  /** Asks the server to revoke the token, closes the socket, and dials no more until the next pair. */
  unpair(): void;
}

const FIRST_DELAY = 500;
const LAST_DELAY = 10_000;
const OPEN = 1;

/** The sandbox's answer to `read-token`: the token it kept in clientStorage, or null; undefined for any other message. */
export function storedToken(message: unknown): string | null | undefined {
  if (typeof message !== 'object' || message === null) return undefined;
  const { type, token } = message as { type?: unknown; token?: unknown };
  if (type !== 'stored-token') return undefined;
  return typeof token === 'string' ? token : null;
}

/**
 * Carries messages between the sandbox and zaku-mcp, and redials after a drop. It dials only while it holds
 * a credential, and puts that credential on the sandbox's hello, which is the first message the server reads.
 */
export function startRelay(options: RelayOptions): Relay {
  let socket: SocketLike | null = null;
  let credential: Credential | null = null;
  let delay = FIRST_DELAY;
  let everOpened = false;
  const send = (message: unknown): void => {
    if (socket?.readyState === OPEN) socket.send(JSON.stringify(message));
  };
  const hangUp = (): void => {
    if (socket === null) return;
    const closing = socket;
    socket = null;
    closing.onclose = null;
    closing.close();
  };
  options.listen((message) => {
    const token = storedToken(message);
    if (token !== undefined) {
      if (token !== null) dialWith({ token });
      return;
    }
    const hello = fileHelloSchema.safeParse(message);
    if (!hello.success) return send(message);
    if (credential !== null) send({ ...hello.data, credential });
  });
  const receive = (message: unknown): void => {
    const parsed = serverMessageSchema.safeParse(message);
    if (!parsed.success) return;
    if (parsed.data.type === 'paired') credential = { token: parsed.data.token };
    // The server closes a refused connection; dialing again would present the same refused credential.
    if (parsed.data.type === 'refused') credential = null;
  };
  const dial = (): void => {
    const current = options.open(options.url);
    socket = current;
    current.onopen = (): void => {
      delay = FIRST_DELAY;
      everOpened = true;
      options.onStatus('connected');
      options.post({ type: 'connected' });
    };
    current.onmessage = (event): void => {
      let message: unknown;
      try {
        message = JSON.parse(event.data);
      } catch {
        return; // not a bridge message
      }
      receive(message);
      options.post(message);
    };
    current.onclose = (): void => {
      socket = null;
      if (credential === null) {
        options.onStatus('disconnected');
        return;
      }
      options.onStatus(everOpened && delay < LAST_DELAY ? 'reconnecting' : 'disconnected');
      options.schedule(() => {
        if (socket === null && credential !== null) dial();
      }, delay);
      delay = Math.min(delay * 2, LAST_DELAY);
    };
  };
  const dialWith = (next: Credential): void => {
    credential = next;
    hangUp();
    delay = FIRST_DELAY;
    dial();
  };
  options.onStatus('disconnected');
  return {
    send,
    pair: (code) => dialWith({ code }),
    unpair: (): void => {
      send({ type: 'unpair' });
      credential = null;
      hangUp();
      options.onStatus('disconnected');
    },
  };
}
