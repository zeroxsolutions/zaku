import type { NodeSnapshot, PluginMessage, ServerMessage } from '@zeroxsolutions/zaku/schema';

const AsyncFunction = Object.getPrototypeOf(async (): Promise<void> => undefined).constructor as new (
  ...params: string[]
) => (...args: unknown[]) => Promise<unknown>;

type AnyNode = {
  id: string;
  name: string;
  type: string;
  removed: boolean;
  remove(): void;
  parent?: AnyNode | null;
  appendChild?(child: AnyNode): void;
  absoluteTransform?: [[number, number, number], [number, number, number]];
  x?: number;
  y?: number;
};

/** A node on a page. A style a create* call returns has an id and a type, `TEXT` for a text style, and no parent. */
const onPage = (node: AnyNode): boolean => 'parent' in node;
type Change = { nodeChanges: { type: string; node: AnyNode; properties?: string[] }[] };

export interface RunnerHost {
  figma: PluginAPI;
  snapshot: (node: AnyNode, created: boolean) => Promise<NodeSnapshot>;
  holdTimer: { set(fn: () => void, ms: number): unknown; clear(handle: unknown): void };
  helper?: unknown;
}

interface Pending {
  runId: string;
  created: AnyNode[];
  mutated: Set<string>;
  /** Nodes that were there before the run and that it moved; one moved into a node the run made goes when that node does. */
  moved: Map<string, AnyNode>;
  hold: unknown;
}

/** Runs one script at a time against the file, holds its change, and keeps or removes it on the server's word. */
export function createRunner(
  host: RunnerHost,
  post: (message: PluginMessage) => void,
): { receive(m: ServerMessage): Promise<void> } {
  const figma = host.figma as unknown as Record<string, unknown> & {
    currentPage: {
      on(e: 'nodechange', l: (c: Change) => void): void;
      off(e: 'nodechange', l: (c: Change) => void): void;
    };
    commitUndo(): void;
    getNodeByIdAsync(id: string): Promise<AnyNode | null>;
  };
  let pending: Pending | null = null;
  const abandoned = new Set<string>();

  /**
   * Removes what the run made. A node that was there before and that the run moved into one of them is
   * moved out first, to the nearest ancestor that stays, where it keeps its place on the canvas: removing
   * a node removes everything inside it, and that node may hold work an earlier run committed.
   */
  const discard = (run: Pending): void => {
    const made = new Set(run.created.map((node) => node.id));
    for (const node of run.moved.values()) {
      if (node.removed) continue;
      let doomed = false;
      let keeper: AnyNode | null = null;
      for (let up = node.parent ?? null; up; up = up.parent ?? null) {
        if (!made.has(up.id)) {
          keeper = up;
          break;
        }
        doomed = true;
      }
      if (!doomed) continue;
      const target = keeper ?? (figma.currentPage as unknown as AnyNode);
      const at = node.absoluteTransform;
      target.appendChild?.(node);
      if (at) {
        const origin = target.absoluteTransform;
        node.x = at[0][2] - (origin ? origin[0][2] : 0);
        node.y = at[1][2] - (origin ? origin[1][2] : 0);
      }
    }
    for (const node of run.created) if (!node.removed) node.remove();
  };

  const rollback = (run: Pending): void => {
    host.holdTimer.clear(run.hold);
    discard(run);
    post({ type: 'settled', runId: run.runId, outcome: 'rolled-back', untouchable: [...run.mutated] });
    if (pending === run) pending = null;
  };

  async function execute(message: Extract<ServerMessage, { type: 'run' }>): Promise<void> {
    if (abandoned.delete(message.runId)) {
      // The server gave up on this run before it started; it never touches the file.
      post({ type: 'settled', runId: message.runId, outcome: 'rolled-back', untouchable: [] });
      return;
    }
    // A change still held when the next run starts was never decided; it is not kept.
    if (pending) rollback(pending);
    figma.commitUndo();
    const run: Pending = { runId: message.runId, created: [], mutated: new Set(), moved: new Map(), hold: null };
    // The API object refuses assignment to its methods, and a proxy over it must hand back its read-only
    // members unchanged, so the script gets a proxy over an empty object that forwards to it and records each create*.
    const api = host.figma as object;
    const watched = new Proxy(
      {},
      {
        get(_view, property): unknown {
          const value = Reflect.get(api, property);
          if (typeof value !== 'function') return value;
          const records = typeof property === 'string' && property.startsWith('create');
          return (...args: unknown[]): unknown => {
            const result = (value as (...a: unknown[]) => unknown).apply(api, args);
            if (records && result && typeof result === 'object' && 'id' in result) run.created.push(result as AnyNode);
            return result;
          };
        },
        set: (_view, property, value): boolean => Reflect.set(api, property, value),
        has: (_view, property): boolean => property in api,
      },
    );
    const createdIds = (): Set<string> => new Set(run.created.map((node) => node.id));
    // A node made without a create* call (an instance, a clone) is known only from the page's CREATE event.
    const madeElsewhere = new Set<string>();
    const onChange = (change: Change): void => {
      const created = createdIds();
      for (const { type, node, properties } of change.nodeChanges) {
        if (created.has(node.id)) continue;
        if (type === 'CREATE') madeElsewhere.add(node.id);
        else if (type === 'PROPERTY_CHANGE' && !madeElsewhere.has(node.id)) {
          run.mutated.add(node.id);
          if (properties?.includes('parent')) run.moved.set(node.id, node);
        }
      }
    };
    figma.currentPage.on('nodechange', onChange);
    let value: unknown;
    let failure: string | null = null;
    try {
      value = await new AsyncFunction('figma', 'zaku', message.script)(watched, host.helper);
    } catch (error) {
      failure = String(error);
    } finally {
      figma.currentPage.off('nodechange', onChange);
    }
    const known = createdIds();
    for (const id of madeElsewhere) {
      if (known.has(id)) continue;
      const node = await figma.getNodeByIdAsync(id);
      if (node) run.created.push(node);
    }
    if (failure !== null) {
      discard(run);
      if (!abandoned.delete(message.runId))
        post({ type: 'threw', runId: message.runId, error: failure, untouchable: [...run.mutated] });
      return;
    }
    if (abandoned.delete(message.runId)) {
      run.hold = null;
      pending = run;
      rollback(run);
      return;
    }
    const snapshot: NodeSnapshot[] = [];
    try {
      const live = run.created.filter((node) => !node.removed && onPage(node));
      for (const node of live) snapshot.push(await host.snapshot(node, true));
      for (const id of run.mutated) {
        const node = await figma.getNodeByIdAsync(id);
        if (node && !node.removed) snapshot.push(await host.snapshot(node, false));
      }
      // A set combined on a page other than the one listened to is heard by no event; its variants still name it.
      const seen = new Set([...live.map((node) => node.id), ...run.mutated]);
      for (const node of live) {
        const set = node.parent;
        if (set?.type !== 'COMPONENT_SET' || set.removed || seen.has(set.id)) continue;
        seen.add(set.id);
        snapshot.push(await host.snapshot(set, false));
      }
    } catch (error) {
      // Unanswered, the server would wait out its timeout; a change nobody could check is not kept.
      discard(run);
      post({ type: 'threw', runId: message.runId, error: String(error), untouchable: [...run.mutated] });
      return;
    }
    // A rollback can arrive while the snapshot is taken; the run is then never held.
    if (abandoned.delete(message.runId)) {
      rollback(run);
      return;
    }
    pending = run;
    run.hold = host.holdTimer.set(() => pending === run && rollback(run), message.holdMs);
    post({
      type: 'ran',
      runId: run.runId,
      ok: true,
      value: toJson(value),
      created: run.created.filter((node) => !node.removed).map((node) => node.id),
      mutated: [...run.mutated],
      snapshot,
    });
  }

  // Runs go one at a time: a run the server gave up on can still be running when the next arrives.
  let queue: Promise<void> = Promise.resolve();

  return {
    receive(message: ServerMessage): Promise<void> {
      if (message.type === 'run') {
        queue = queue.then(() => execute(message)).catch(() => undefined);
        return queue;
      }
      if (message.type !== 'decide') return Promise.resolve();
      const run = pending;
      if (run && run.runId === message.runId) {
        if (message.decision === 'rollback') rollback(run);
        else {
          host.holdTimer.clear(run.hold);
          figma.commitUndo();
          post({ type: 'settled', runId: run.runId, outcome: 'committed', untouchable: [] });
          pending = null;
        }
      } else if (message.decision === 'rollback') {
        // Still running, still queued, or being snapshotted: the run settles as rolled back when it gets there.
        abandoned.add(message.runId);
      }
      return Promise.resolve();
    },
  };
}

/** A node, a function or a cycle cannot cross postMessage; the value goes as JSON or as its string. */
function toJson(value: unknown): unknown {
  try {
    return JSON.parse(
      JSON.stringify(value ?? null, (_key, v) =>
        v && typeof v === 'object' && 'id' in v && 'type' in v ? { id: v.id, type: v.type, name: v.name } : v,
      ),
    );
  } catch {
    return String(value);
  }
}
