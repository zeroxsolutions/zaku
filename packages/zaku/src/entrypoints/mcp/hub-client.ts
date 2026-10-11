import { connect, type Socket } from 'node:net';
import { hubHelloSchema, type ClientHello, type HubHello } from './hub-protocol.js';

export interface ClientSeams {
  socketPath: string;
  /** This binary's build stamp; a hub of an older one is asked to give way. */
  build: number;
  cwd: string;
  designRoot: string;
  /** Starts `zaku-mcp hub` detached, for when nothing answers on the socket. */
  spawnHub: () => void;
  stdin: NodeJS.ReadableStream;
  stdout: NodeJS.WritableStream;
  /** How long to keep dialing a hub that was just started. */
  connectMs?: number;
}

type Message = { id?: number | string; method?: string };

const RETRY_MS = 100;
/** A request in flight when the hub went away is answered with this, so the agent calls again. */
const RESTARTED = { code: -32000, message: 'zaku hub restarted; call again' };

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function dial(socketPath: string): Promise<Socket | null> {
  return new Promise((resolve) => {
    const socket = connect(socketPath);
    socket.once('connect', () => {
      socket.removeAllListeners('error');
      resolve(socket);
    });
    socket.once('error', () => resolve(null));
  });
}

/** Splits a stream into lines, calling `each` for every complete one. */
function lines(stream: NodeJS.ReadableStream | Socket, each: (line: string) => void): void {
  let buffer = '';
  stream.on('data', (chunk: Buffer | string) => {
    buffer += String(chunk);
    let end;
    while ((end = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, end);
      buffer = buffer.slice(end + 1);
      if (line.trim()) each(line);
    }
  });
}

const parse = (line: string): Message => {
  try {
    return JSON.parse(line) as Message;
  } catch {
    return {};
  }
};

/**
 * Pipes the agent's stdio to the hub until stdin ends, starting the hub when nothing answers, starting it again when
 * it goes away, and replaying the session's initialize to each new one. Answers the exit code.
 */
export async function runClient(seams: ClientSeams): Promise<number> {
  const connectMs = seams.connectMs ?? 5000;
  let socket: Socket | null = null;
  let ended = false;
  let initialize: string | null = null;
  let initialized: string | null = null;
  /** Ids of the agent's requests the hub has not answered. */
  const inFlight = new Set<number | string>();
  /** The replayed initialize's id, whose answer the agent already has. */
  let replayed: number | string | null = null;
  const queued: string[] = [];
  const write = (line: string): void => void seams.stdout.write(`${line}\n`);

  /** Dials the hub, starting one when none answers, and reads its hello; null once stdin has ended. */
  const reach = async (): Promise<{ socket: Socket; hello: HubHello } | null> => {
    let started = false;
    for (;;) {
      if (ended) return null;
      const deadline = Date.now() + connectMs;
      let next: Socket | null = null;
      while (!next && Date.now() < deadline) {
        next = await dial(seams.socketPath);
        if (next) break;
        if (!started) {
          started = true;
          seams.spawnHub();
        }
        await sleep(RETRY_MS);
      }
      if (!next) throw new Error(`zaku hub did not answer on ${seams.socketPath} within ${connectMs} ms`);
      const hello: ClientHello = {
        type: 'client',
        cwd: seams.cwd,
        designRoot: seams.designRoot,
        build: seams.build,
        handover: true,
      };
      next.write(`${JSON.stringify(hello)}\n`);
      const answer = await new Promise<HubHello | null>((resolve) => {
        let buffer = '';
        const onData = (chunk: Buffer): void => {
          buffer += String(chunk);
          const end = buffer.indexOf('\n');
          if (end < 0) return;
          next?.off('data', onData);
          const rest = buffer.slice(end + 1);
          if (rest) next?.unshift(Buffer.from(rest));
          const parsed = hubHelloSchema.safeParse(parse(buffer.slice(0, end)));
          resolve(parsed.success ? parsed.data : null);
        };
        next?.on('data', onData);
        next?.once('close', () => resolve(null));
      });
      if (answer && !answer.handingOver) return { socket: next, hello: answer };
      // The hub is giving way to this build: wait for it to go, then start this one.
      await new Promise((resolve) => (next.destroyed ? resolve(null) : next.once('close', resolve)));
      started = false;
    }
  };

  const attach = async (): Promise<void> => {
    const reached = await reach();
    if (!reached) return;
    const current = reached.socket;
    socket = current;
    lines(current, (line) => {
      const message = parse(line);
      if (message.id !== undefined && message.method === undefined) {
        if (message.id === replayed) {
          replayed = null;
          if (initialized) current.write(`${initialized}\n`);
          // What the agent sent while the new hub was being initialized goes now.
          for (const queuedLine of queued.splice(0)) send(queuedLine);
          return;
        }
        inFlight.delete(message.id);
      }
      write(line);
    });
    current.once('close', () => {
      if (socket === current) socket = null;
      if (ended) return;
      for (const id of inFlight) write(JSON.stringify({ jsonrpc: '2.0', id, error: RESTARTED }));
      inFlight.clear();
      void attach();
    });
    if (initialize) {
      replayed = parse(initialize).id ?? null;
      current.write(`${initialize}\n`);
    }
    for (const line of queued.splice(0)) send(line);
  };

  const send = (line: string): void => {
    const message = parse(line);
    if (!socket || replayed !== null) {
      queued.push(line);
      return;
    }
    // Kept once a hub has had them, so a hub started later is initialized the same way.
    if (message.method === 'initialize' && initialize === null) initialize = line;
    if (message.method === 'notifications/initialized' && initialized === null) initialized = line;
    if (message.method !== undefined && message.id !== undefined) inFlight.add(message.id);
    socket.write(`${line}\n`);
  };

  const done = new Promise<number>((resolve) => {
    const finish = (): void => {
      if (ended) return;
      ended = true;
      socket?.end();
      resolve(0);
    };
    seams.stdin.once('end', finish);
    seams.stdin.once('close', finish);
  });
  lines(seams.stdin, (line) => send(line));
  await attach();
  return done;
}
