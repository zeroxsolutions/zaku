import {
  fileHelloSchema,
  serverMessageSchema,
  type Credential,
  type PluginMessage,
  type ServerMessage,
} from '@zeroxsolutions/zaku/schema';

export interface SocketLike {
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  readyState: number;
  send(data: string): void;
  close(): void;
}

/** Where the relay stands with zaku-mcp; `port` is the one it is connected on, or keeps dialing. */
export type Connection =
  /** It holds no credential, so it dials nothing. */
  | { state: 'idle' }
  | { state: 'connected'; port: number }
  /** It dropped after an open, and redials before the delay reaches its cap. */
  | { state: 'reconnecting'; port: number }
  /** Nothing answered: on any port of the first scan, then on `port` once the delay reached its cap. */
  | { state: 'disconnected'; port: number };

export interface RelayOptions {
  /** The ports zaku-mcp may listen on; the first is dialed until the sandbox names the last one that connected. */
  ports: readonly [number, ...number[]];
  post: (message: unknown) => void;
  listen: (callback: (message: unknown) => void) => void;
  open: (url: string) => SocketLike;
  schedule: (fn: () => void, ms: number) => void;
  onConnection: (connection: Connection) => void;
}

export interface Relay {
  /** Sends the panel's own message to zaku-mcp; dropped while the socket is closed. */
  send(message: PluginMessage): void;
  /** Dials with the code the user typed, digits only; the token the server answers with replaces it. */
  pair(code: string): void;
  /** Asks the server to revoke the token, closes the socket, and dials no more until the next pair. */
  unpair(): void;
  /**
   * Dials `port` at once and redials it from then on, with no scan of the other ports; while it holds no
   * credential, it only keeps the port for the next code.
   */
  connect(port: number): void;
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

/** The port the sandbox kept beside the token: the last one the panel connected on, or null. */
function storedPort(message: unknown): number | null {
  const { port } = message as { port?: unknown };
  return typeof port === 'number' ? port : null;
}

/**
 * Carries messages between the sandbox and zaku-mcp, and redials after a drop. It dials only while it holds
 * a credential, and puts that credential on the sandbox's hello, which is the first message the server reads.
 * The first dial for a credential tries the preferred port, then every other port once, unless the user chose
 * the port; a redial tries the preferred port alone.
 *
 * A token one zaku-mcp does not know may belong to another on the same machine, such as a test run's
 * zaku-mcp holding a port of the range while the user's own one holds another. So that refusal sends the
 * relay on to the ports this round has not dialed, and the panel hears of it only once none admitted the
 * token. The sandbox keeps the token through it, for the next time the panel opens.
 */
export function startRelay(options: RelayOptions): Relay {
  let socket: SocketLike | null = null;
  let credential: Credential | null = null;
  let delay = FIRST_DELAY;
  let everOpened = false;
  /** The port dialed first and redialed after a drop: the last one connected on, or the one the user asked for. */
  let preferred = options.ports[0];
  /** The ports the first dial for a credential still has to try before it reports nothing answered. */
  let scan: number[] = [];
  /** The user picked `preferred`, so a code goes there alone; another zaku-mcp would refuse it as wrong. */
  let chosen = false;
  /** The ports dialed since the last dial for a credential, or the last redial, began a round. */
  let round = new Set<number>();
  /** A token refusal held back while the round still has ports to try; cleared when another socket opens. */
  let held: Extract<ServerMessage, { type: 'refused' }> | null = null;
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
      const port = storedPort(message);
      if (port !== null && options.ports.includes(port)) preferred = port;
      if (token !== null) dialWith({ token });
      return;
    }
    const hello = fileHelloSchema.safeParse(message);
    if (!hello.success) return send(message);
    if (credential !== null) send({ ...hello.data, credential });
  });
  /** Reads what the server said, and answers whether the panel and the sandbox hear it now. */
  const receive = (message: unknown): boolean => {
    const parsed = serverMessageSchema.safeParse(message);
    if (!parsed.success) return true;
    if (parsed.data.type === 'paired') credential = { token: parsed.data.token };
    if (parsed.data.type !== 'refused') return true;
    const rest = options.ports.filter((port) => !round.has(port));
    // The user picked this port, so no other zaku-mcp is the one they meant.
    if (parsed.data.reason === 'unknown-token' && !chosen && rest.length > 0) {
      held = parsed.data;
      scan = rest;
      return false;
    }
    // The server closes a refused connection; dialing again would present the same refused credential.
    credential = null;
    held = null;
    return true;
  };
  const dial = (port: number): void => {
    const current = options.open(`ws://localhost:${port}`);
    socket = current;
    round.add(port);
    current.onopen = (): void => {
      held = null;
      delay = FIRST_DELAY;
      everOpened = true;
      preferred = port;
      scan = [];
      options.onConnection({ state: 'connected', port });
      options.post({ type: 'connected', port });
    };
    current.onmessage = (event): void => {
      let message: unknown;
      try {
        message = JSON.parse(event.data);
      } catch {
        return; // not a bridge message
      }
      if (receive(message)) options.post(message);
    };
    current.onclose = (): void => {
      socket = null;
      if (credential === null) {
        options.onConnection({ state: 'idle' });
        return;
      }
      const next = scan.shift();
      if (next !== undefined) return dial(next);
      if (held !== null) {
        options.post(held);
        credential = null;
        held = null;
        options.onConnection({ state: 'idle' });
        return;
      }
      options.onConnection({
        state: everOpened && delay < LAST_DELAY ? 'reconnecting' : 'disconnected',
        port: preferred,
      });
      options.schedule(() => {
        if (socket !== null || credential === null) return;
        round = new Set();
        dial(preferred);
      }, delay);
      delay = Math.min(delay * 2, LAST_DELAY);
    };
  };
  const dialWith = (next: Credential): void => {
    credential = next;
    hangUp();
    delay = FIRST_DELAY;
    round = new Set();
    held = null;
    scan = chosen ? [] : options.ports.filter((port) => port !== preferred);
    dial(preferred);
  };
  options.onConnection({ state: 'idle' });
  return {
    send,
    pair: (code) => dialWith({ code }),
    unpair: (): void => {
      send({ type: 'unpair' });
      credential = null;
      hangUp();
      options.onConnection({ state: 'idle' });
    },
    connect: (port): void => {
      preferred = port;
      chosen = true;
      if (credential === null) return;
      hangUp();
      delay = FIRST_DELAY;
      round = new Set();
      held = null;
      scan = [];
      dial(port);
    },
  };
}
