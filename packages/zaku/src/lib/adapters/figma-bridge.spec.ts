import type { PluginMessage, ServerMessage } from '../schema/bridge.js';
import { FileNotConnected, FileRequired, PluginNotConnected } from '../domain/errors/index.js';
import { FigmaBridge, type BridgeConnection } from './figma-bridge.js';

class FakeConnection implements BridgeConnection {
  sent: ServerMessage[] = [];
  open = true;
  private listener: (message: unknown) => void = () => undefined;
  private closed: () => void = () => undefined;
  send(message: ServerMessage): void {
    this.sent.push(message);
    this.reply?.(message);
  }
  onMessage(listener: (message: unknown) => void): void {
    this.listener = listener;
  }
  onClose(listener: () => void): void {
    this.closed = listener;
  }
  isOpen(): boolean {
    return this.open;
  }
  reply?: (message: ServerMessage) => void;
  emit(message: PluginMessage): void {
    this.listener(message);
  }
  close(): void {
    this.open = false;
    this.closed();
  }
}

const hello = (file: string): PluginMessage => ({
  type: 'hello',
  file,
  pages: [{ id: '0:1', name: 'Page 1' }],
  currentPage: '0:1',
  selection: [],
  pluginVersion: '0.1.0',
  user: null,
  credential: { token: 'secret' },
});

let ids = 0;
const bridge = (): FigmaBridge => new FigmaBridge({ timeoutMs: 50, holdMs: 100, readMs: 50 }, () => `r${++ids}`);

describe('FigmaBridge', () => {
  it('refuses a call when no plugin is connected', () => {
    expect(() => bridge().session()).toThrow(PluginNotConnected);
  });

  it('opens a session on hello and names it by file', () => {
    const b = bridge();
    const c = new FakeConnection();
    b.attach(c);
    c.emit(hello('Ant Design'));
    expect(b.sessions().map((s) => s.file)).toEqual(['Ant Design']);
    expect(b.session().file).toBe('Ant Design');
  });

  it('keeps the credential out of the session the agent reads', () => {
    const b = bridge();
    const c = new FakeConnection();
    b.attach(c);
    c.emit(hello('A'));
    expect(JSON.stringify(b.sessions())).not.toContain('secret');
  });

  it('asks for a file when two are connected, and refuses one that is not', () => {
    const b = bridge();
    for (const file of ['A', 'B']) {
      const c = new FakeConnection();
      b.attach(c);
      c.emit(hello(file));
    }
    expect(() => b.session()).toThrow(FileRequired);
    expect(() => b.session('C')).toThrow(FileNotConnected);
    expect(b.session('B').file).toBe('B');
  });

  it('ignores a message that does not parse', () => {
    const b = bridge();
    const c = new FakeConnection();
    b.attach(c);
    expect(() => c.emit({ type: 'nonsense' } as unknown as PluginMessage)).not.toThrow();
    expect(b.sessions()).toEqual([]);
  });

  it('waits the run budget for a snapshot, which outlasts a read on a large set', async () => {
    const b = new FigmaBridge({ timeoutMs: 200, holdMs: 100, readMs: 20 }, () => `r${++ids}`);
    const c = new FakeConnection();
    b.attach(c);
    c.emit(hello('A'));
    c.reply = (m): void => {
      if (m.type === 'snapshot')
        setTimeout(() => c.emit({ type: 'read-result', requestId: m.requestId, snapshot: [] }), 60);
    };
    await expect(b.snapshot(b.session(), { all: true })).resolves.toEqual([]);
  });

  it('returns what the plugin ran', async () => {
    const b = bridge();
    const c = new FakeConnection();
    b.attach(c);
    c.emit(hello('A'));
    c.reply = (m): void => {
      if (m.type === 'run')
        queueMicrotask(() =>
          c.emit({ type: 'ran', runId: m.runId, ok: true, value: 1, created: ['1:1'], mutated: [], snapshot: [] }),
        );
    };
    const outcome = await b.run(b.session(), 'return 1');
    expect(outcome).toMatchObject({ kind: 'ran', value: 1, created: ['1:1'] });
  });

  it('times out a run the plugin never answers, and tells the plugin to roll it back', async () => {
    const b = bridge();
    const c = new FakeConnection();
    b.attach(c);
    c.emit(hello('A'));
    const outcome = await b.run(b.session(), 'while (true) {}');
    expect(outcome).toEqual({ kind: 'timeout', budgetMs: 50, settled: null });
    expect(c.sent.at(-1)).toMatchObject({ type: 'decide', decision: 'rollback' });
  });

  it('reports what the plugin removed and left when it gives a timed-out run up', async () => {
    const b = bridge();
    const c = new FakeConnection();
    b.attach(c);
    c.emit(hello('A'));
    c.reply = (m): void => {
      if (m.type === 'decide')
        queueMicrotask(() =>
          c.emit({ type: 'settled', runId: m.runId, outcome: 'rolled-back', untouchable: ['9:1'], left: ['1:2'] }),
        );
    };
    expect(await b.run(b.session(), 'await new Promise(() => undefined)')).toEqual({
      kind: 'timeout',
      budgetMs: 50,
      settled: { untouchable: ['9:1'], left: ['1:2'] },
    });
  });

  it('answers dropped when the connection closes mid-run', async () => {
    const b = bridge();
    const c = new FakeConnection();
    b.attach(c);
    c.emit(hello('A'));
    c.reply = (m): void => {
      if (m.type === 'run') queueMicrotask(() => c.close());
    };
    expect(await b.run(b.session(), 'return 1')).toEqual({ kind: 'dropped' });
    expect(b.sessions()).toEqual([]);
  });

  it('runs one execute per file at a time', async () => {
    const b = bridge();
    const c = new FakeConnection();
    b.attach(c);
    c.emit(hello('A'));
    const order: string[] = [];
    const s = b.session();
    let release!: () => void;
    const first = b.exclusive(s, async () => {
      order.push('first start');
      await new Promise<void>((resolve) => (release = resolve));
      order.push('first end');
    });
    const second = b.exclusive(s, async () => {
      order.push('second');
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(order).toEqual(['first start']);
    release();
    await Promise.all([first, second]);
    expect(order).toEqual(['first start', 'first end', 'second']);
  });

  it('releases the queue when the connection drops', async () => {
    const b = bridge();
    const c = new FakeConnection();
    b.attach(c);
    c.emit(hello('A'));
    const s = b.session();
    c.reply = (m): void => {
      if (m.type === 'run') queueMicrotask(() => c.close());
    };
    const first = b.exclusive(s, () => b.run(s, 'return 1'));
    const second = b.exclusive(s, () => b.run(s, 'return 2'));
    expect(await first).toEqual({ kind: 'dropped' });
    await expect(second).rejects.toThrow(PluginNotConnected);
  });
});
