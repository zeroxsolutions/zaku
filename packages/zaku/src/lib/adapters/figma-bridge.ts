import { FileNotConnected, FileRequired, PluginNotConnected } from '../domain/errors/index.js';
import {
  pluginMessageSchema,
  type CheckScope,
  type NodeSnapshot,
  type OutlineNode,
  type PluginMessage,
  type ReadTarget,
  type ServerMessage,
  type SessionView,
} from '../schema/bridge.js';

/** The transport the plugin's socket is reached through; the MCP entrypoint builds it over a WebSocket. */
export interface BridgeConnection {
  send(message: ServerMessage): void;
  onMessage(listener: (message: unknown) => void): void;
  onClose(listener: () => void): void;
  isOpen(): boolean;
}

export interface Session extends SessionView {
  readonly connection: BridgeConnection;
}

export type RunOutcome =
  | { kind: 'ran'; runId: string; value: unknown; created: string[]; mutated: string[]; snapshot: NodeSnapshot[] }
  | { kind: 'threw'; error: string; untouchable: string[]; left: string[] }
  /** `settled` is the plugin's word that it gave the run up, or null when it did not answer that either. */
  | { kind: 'timeout'; budgetMs: number; settled: { untouchable: string[]; left: string[] } | null }
  | { kind: 'dropped' };

export type Settled =
  | { kind: 'settled'; outcome: 'committed' | 'rolled-back'; untouchable: string[]; left: string[] }
  | { kind: 'dropped' };

export interface BridgeTimings {
  timeoutMs: number;
  holdMs: number;
  readMs: number;
}

export const DEFAULT_TIMINGS: BridgeTimings = { timeoutMs: 30_000, holdMs: 60_000, readMs: 10_000 };

type Waiter = (message: PluginMessage | null) => void;

/** The connected plugins, one session per open file, and the request and reply over each. */
export class FigmaBridge {
  private readonly open = new Map<BridgeConnection, Session>();
  private readonly waiters = new Map<string, { connection: BridgeConnection; resolve: Waiter }>();
  private readonly queues = new Map<BridgeConnection, Promise<unknown>>();
  private readonly checkListeners: ((session: Session, scope: CheckScope) => void)[] = [];

  constructor(
    private readonly timings: BridgeTimings,
    private readonly nextId: () => string = () => crypto.randomUUID(),
  ) {}

  attach(connection: BridgeConnection): void {
    connection.onMessage((raw) => {
      const parsed = pluginMessageSchema.safeParse(raw);
      if (!parsed.success) return;
      this.receive(connection, parsed.data);
    });
    connection.onClose(() => {
      this.open.delete(connection);
      this.queues.delete(connection);
      for (const [id, waiter] of this.waiters) {
        if (waiter.connection !== connection) continue;
        this.waiters.delete(id);
        waiter.resolve(null);
      }
    });
  }

  /** The panel asked for a check; the entrypoint runs it and pushes the findings. */
  onCheck(listener: (session: Session, scope: CheckScope) => void): void {
    this.checkListeners.push(listener);
  }

  sessions(): SessionView[] {
    return [...this.open.values()].map(({ connection: _connection, ...view }) => view);
  }

  session(file?: string): Session {
    const all = [...this.open.values()];
    if (all.length === 0) throw new PluginNotConnected();
    if (file === undefined) {
      if (all.length > 1) throw new FileRequired(all.map((s) => s.file));
      return all[0] as Session;
    }
    const found = all.find((s) => s.file === file);
    if (!found)
      throw new FileNotConnected(
        file,
        all.map((s) => s.file),
      );
    return found;
  }

  /** One piece of work per file at a time; the next waits, and a closed connection refuses it. */
  exclusive<T>(session: Session, work: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(session.connection) ?? Promise.resolve();
    const next = previous
      .catch(() => undefined)
      .then(() => {
        if (!session.connection.isOpen() || !this.open.has(session.connection)) throw new PluginNotConnected();
        return work();
      });
    this.queues.set(session.connection, next);
    return next;
  }

  async run(session: Session, script: string): Promise<RunOutcome> {
    const runId = this.nextId();
    const reply = this.await(session.connection, runId, this.timings.timeoutMs);
    session.connection.send({
      type: 'run',
      runId,
      script,
      timeoutMs: this.timings.timeoutMs,
      holdMs: this.timings.holdMs,
    });
    const message = await reply;
    if (message === null) return { kind: 'dropped' };
    if (message === 'timeout') {
      const given = await this.decide(session, runId, 'rollback');
      return {
        kind: 'timeout',
        budgetMs: this.timings.timeoutMs,
        settled: given.kind === 'settled' ? { untouchable: given.untouchable, left: given.left } : null,
      };
    }
    if (message.type === 'threw')
      return { kind: 'threw', error: message.error, untouchable: message.untouchable, left: message.left };
    if (message.type !== 'ran') return { kind: 'dropped' };
    const { value, created, mutated, snapshot } = message;
    return { kind: 'ran', runId, value, created, mutated, snapshot };
  }

  async decide(session: Session, runId: string, decision: 'commit' | 'rollback'): Promise<Settled> {
    if (!session.connection.isOpen()) return { kind: 'dropped' };
    const reply = this.await(session.connection, `settled:${runId}`, this.timings.readMs);
    session.connection.send({ type: 'decide', runId, decision });
    const message = await reply;
    if (message === null || message === 'timeout' || message.type !== 'settled') return { kind: 'dropped' };
    return { kind: 'settled', outcome: message.outcome, untouchable: message.untouchable, left: message.left };
  }

  async read(session: Session, target: ReadTarget, depth: number): Promise<OutlineNode[]> {
    const message = await this.request(session, (requestId) => ({ type: 'read', requestId, target, depth }));
    return message.nodes ?? [];
  }

  async snapshot(session: Session, scope: CheckScope): Promise<NodeSnapshot[]> {
    const message = await this.request(session, (requestId) => ({ type: 'snapshot', requestId, scope }));
    return message.snapshot ?? [];
  }

  push(session: Session, message: Extract<ServerMessage, { type: 'findings' | 'select' }>): void {
    if (session.connection.isOpen()) session.connection.send(message);
  }

  private async request(
    session: Session,
    build: (requestId: string) => ServerMessage,
  ): Promise<Extract<PluginMessage, { type: 'read-result' }>> {
    const requestId = this.nextId();
    const reply = this.await(session.connection, requestId, this.timings.readMs);
    session.connection.send(build(requestId));
    const message = await reply;
    if (message === null) throw new PluginNotConnected();
    if (message === 'timeout') throw new Error(`the plugin did not answer within ${this.timings.readMs} ms`);
    if (message.type !== 'read-result') throw new Error(`unexpected ${message.type}`);
    if (message.error) throw new Error(message.error);
    return message;
  }

  private await(connection: BridgeConnection, id: string, ms: number): Promise<PluginMessage | null | 'timeout'> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.waiters.delete(id);
        resolve('timeout');
      }, ms);
      this.waiters.set(id, {
        connection,
        resolve: (message) => {
          clearTimeout(timer);
          resolve(message);
        },
      });
    });
  }

  private receive(connection: BridgeConnection, message: PluginMessage): void {
    if (message.type === 'hello') {
      const { type: _type, credential: _credential, ...view } = message;
      this.open.set(connection, { ...view, connection });
      return;
    }
    const session = this.open.get(connection);
    // The socket that admitted the connection answers its unpair.
    if (!session || message.type === 'unpair') return;
    if (message.type === 'check') {
      for (const listener of this.checkListeners) listener(session, message.scope);
      return;
    }
    if (message.type === 'state') {
      session.currentPage = message.currentPage;
      session.selection = message.selection;
      return;
    }
    const id =
      message.type === 'settled'
        ? `settled:${message.runId}`
        : message.type === 'read-result'
          ? message.requestId
          : message.runId;
    const waiter = this.waiters.get(id);
    if (!waiter || waiter.connection !== connection) return;
    this.waiters.delete(id);
    waiter.resolve(message);
  }
}
