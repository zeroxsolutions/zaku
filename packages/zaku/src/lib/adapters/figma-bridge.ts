import type { z } from 'zod';
import {
  FileNameShared,
  FileNotConnected,
  FileRequired,
  NodeNotRendered,
  PluginNotConnected,
  ScreenshotTooLarge,
} from '../domain/errors/index.js';
import {
  pluginMessageSchema,
  SCREENSHOT_LIMITS,
  type CheckScope,
  type NodeSnapshot,
  type OutlineNode,
  type PluginMessage,
  type ReadTarget,
  type Screenshot,
  type ScreenshotSize,
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
  /**
   * How long a check waits for the plugin to snapshot its scope; the run budget when absent. A page of thirty
   * screens holds thousands of nodes, which the plugin reads one by one, past a run's budget.
   */
  snapshotMs?: number;
}

export const DEFAULT_TIMINGS: BridgeTimings = {
  timeoutMs: 30_000,
  holdMs: 60_000,
  readMs: 10_000,
  snapshotMs: 120_000,
};

/** A reply this build could not read carries why in place of the message. */
type Reply = PluginMessage | { unreadable: string } | null | 'timeout';
type Waiter = (message: Exclude<Reply, 'timeout'>) => void;

/** The connected plugins, one session per open file, and the request and reply over each. */
export class FigmaBridge {
  private readonly open = new Map<BridgeConnection, Session>();
  private readonly waiters = new Map<string, { connection: BridgeConnection; resolve: Waiter }>();
  private readonly queues = new Map<BridgeConnection, Promise<unknown>>();
  private readonly checkListeners: ((session: Session, scope: CheckScope) => void)[] = [];
  private readonly detachListeners: ((connection: BridgeConnection) => void)[] = [];
  private readonly attachListeners: (() => void)[] = [];
  /** Every admitted panel connection, before and after its hello. */
  private readonly attached = new Set<BridgeConnection>();
  /** Pieces of work queued or running on any file, and who waits for there to be none. */
  private busy = 0;
  private idleWaiters: (() => void)[] = [];

  constructor(
    private readonly timings: BridgeTimings,
    private readonly nextId: () => string = () => crypto.randomUUID(),
  ) {}

  attach(connection: BridgeConnection): void {
    this.attached.add(connection);
    for (const listener of this.attachListeners) listener();
    connection.onMessage((raw) => {
      const parsed = pluginMessageSchema.safeParse(raw);
      if (parsed.success) this.receive(connection, parsed.data);
      else this.unreadable(connection, raw, parsed.error);
    });
    connection.onClose(() => {
      this.attached.delete(connection);
      for (const listener of this.detachListeners) listener(connection);
      this.open.delete(connection);
      this.queues.delete(connection);
      for (const [id, waiter] of this.waiters) {
        if (waiter.connection !== connection) continue;
        this.waiters.delete(id);
        waiter.resolve(null);
      }
    });
  }

  /** A panel was admitted; the hub stays up while one is connected. */
  onAttach(listener: () => void): void {
    this.attachListeners.push(listener);
  }

  /** How many panels are connected. */
  panels(): number {
    return this.attached.size;
  }

  /** A panel's connection closed; whatever the hub kept for its file goes with it. */
  onDetach(listener: (connection: BridgeConnection) => void): void {
    this.detachListeners.push(listener);
  }

  /** The panel asked for a check; the entrypoint runs it and pushes the findings. */
  onCheck(listener: (session: Session, scope: CheckScope) => void): void {
    this.checkListeners.push(listener);
  }

  sessions(): SessionView[] {
    return [...this.open.values()].map(({ connection: _connection, ...view }) => view);
  }

  /** Each connected file's view beside the connection it came on, which the leases are keyed by. */
  sessionsWithConnection(): { view: SessionView; connection: BridgeConnection }[] {
    return [...this.open.values()].map(({ connection, ...view }) => ({ view, connection }));
  }

  session(file?: string): Session {
    const all = [...this.open.values()];
    if (all.length === 0) throw new PluginNotConnected();
    const label = (s: Session): string => (s.fileId ? `${s.file} (${s.fileId})` : s.file);
    if (file === undefined) {
      if (all.length > 1) throw new FileRequired(all.map(label));
      return all[0] as Session;
    }
    const byId = all.find((s) => s.fileId === file);
    if (byId) return byId;
    const named = all.filter((s) => s.file === file);
    if (named.length > 1)
      throw new FileNameShared(
        file,
        named.map((s) => ({ fileId: s.fileId ?? null, pages: s.pages.map((page) => page.name) })),
      );
    const [found] = named;
    if (!found) throw new FileNotConnected(file, all.map(label));
    return found;
  }

  /** Resolves once no script, read or render is queued or running on any file, so the hub can hand over. */
  idle(): Promise<void> {
    if (this.busy === 0) return Promise.resolve();
    return new Promise((resolve) => this.idleWaiters.push(resolve));
  }

  /** One piece of work per file at a time; the next waits, and a closed connection refuses it. */
  exclusive<T>(session: Session, work: () => Promise<T>): Promise<T> {
    this.busy += 1;
    const previous = this.queues.get(session.connection) ?? Promise.resolve();
    const next = previous
      .catch(() => undefined)
      .then(() => {
        if (!session.connection.isOpen() || !this.open.has(session.connection)) throw new PluginNotConnected();
        return work();
      });
    this.queues.set(session.connection, next);
    const settle = (): void => {
      this.busy -= 1;
      if (this.busy > 0) return;
      for (const resolve of this.idleWaiters.splice(0)) resolve();
    };
    next.then(settle, settle);
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
    if (message !== 'timeout' && 'unreadable' in message) {
      // The plugin holds the run for a decision it would otherwise wait the hold out for.
      const given = await this.decide(session, runId, 'rollback');
      return {
        kind: 'threw',
        error: message.unreadable,
        untouchable: given.kind === 'settled' ? given.untouchable : [],
        left: given.kind === 'settled' ? given.left : [],
      };
    }
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
    if (message === null || message === 'timeout' || 'unreadable' in message || message.type !== 'settled')
      return { kind: 'dropped' };
    return { kind: 'settled', outcome: message.outcome, untouchable: message.untouchable, left: message.left };
  }

  async read(session: Session, target: ReadTarget, depth: number): Promise<OutlineNode[]> {
    const message = await this.request(session, (requestId) => ({ type: 'read', requestId, target, depth }));
    return message.nodes ?? [];
  }

  /** Reads what the rules check, within the run budget, since a large component set takes longer than a read. */
  async snapshot(session: Session, scope: CheckScope): Promise<NodeSnapshot[]> {
    const message = await this.request(
      session,
      (requestId) => ({ type: 'snapshot', requestId, scope }),
      this.timings.snapshotMs ?? this.timings.timeoutMs,
    );
    return message.snapshot ?? [];
  }

  /**
   * Renders one node as a PNG, within the run budget, since an export of a large frame takes longer than a read.
   * Throws NodeNotRendered when there is nothing to render, and ScreenshotTooLarge past the limits.
   */
  async screenshot(session: Session, nodeId: string, size: ScreenshotSize): Promise<Screenshot> {
    const requestId = this.nextId();
    const reply = this.await(session.connection, requestId, this.timings.timeoutMs);
    session.connection.send({ type: 'export', requestId, nodeId, size, maxBytes: SCREENSHOT_LIMITS.maxBytes });
    const message = await reply;
    if (message === null) throw new PluginNotConnected();
    if (message === 'timeout')
      throw new NodeNotRendered(nodeId, 'failed', `the plugin did not answer within ${this.timings.timeoutMs} ms`);
    if ('unreadable' in message) throw new NodeNotRendered(nodeId, 'failed', message.unreadable);
    if (message.type === 'exported') {
      const { name, width, height, scale, png } = message;
      return { nodeId, name, width, height, scale, png };
    }
    if (message.type !== 'export-refused') throw new Error(`unexpected ${message.type}`);
    if (message.reason === 'too-large')
      throw new ScreenshotTooLarge(nodeId, message.width ?? 0, message.height ?? 0, message.bytes);
    throw new NodeNotRendered(nodeId, message.reason, message.error);
  }

  push(session: Session, message: Extract<ServerMessage, { type: 'findings' | 'select' }>): void {
    if (session.connection.isOpen()) session.connection.send(message);
  }

  private async request(
    session: Session,
    build: (requestId: string) => ServerMessage,
    ms: number = this.timings.readMs,
  ): Promise<Extract<PluginMessage, { type: 'read-result' }>> {
    const requestId = this.nextId();
    const reply = this.await(session.connection, requestId, ms);
    session.connection.send(build(requestId));
    const message = await reply;
    if (message === null) throw new PluginNotConnected();
    if (message === 'timeout') throw new Error(`the plugin did not answer within ${ms} ms`);
    if ('unreadable' in message) throw new Error(message.unreadable);
    if (message.type !== 'read-result') throw new Error(`unexpected ${message.type}`);
    if (message.error) throw new Error(message.error);
    return message;
  }

  /**
   * A reply this build cannot read answers its call with why, rather than leaving it to wait out its budget: the
   * plugin is of another build, or read a node this schema does not model.
   */
  private unreadable(connection: BridgeConnection, raw: unknown, error: z.ZodError): void {
    const { type, runId, requestId } = (raw ?? {}) as { type?: unknown; runId?: unknown; requestId?: unknown };
    const id = typeof requestId === 'string' ? requestId : type === 'ran' && typeof runId === 'string' ? runId : null;
    if (id === null) return;
    const waiter = this.waiters.get(id);
    if (!waiter || waiter.connection !== connection) return;
    this.waiters.delete(id);
    const where = error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    waiter.resolve({
      unreadable: `the plugin answered with a ${String(type)} zaku-mcp cannot read (${where}); the plugin and zaku-mcp are of different builds, or the plugin read a node zaku-mcp does not model`,
    });
  }

  private await(connection: BridgeConnection, id: string, ms: number): Promise<Reply> {
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
        : message.type === 'read-result' || message.type === 'exported' || message.type === 'export-refused'
          ? message.requestId
          : message.runId;
    const waiter = this.waiters.get(id);
    if (!waiter || waiter.connection !== connection) return;
    this.waiters.delete(id);
    waiter.resolve(message);
  }
}
