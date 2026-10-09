import type { NodeSnapshot, PluginMessage } from '@zeroxsolutions/zaku/schema';
import { FakeFigma } from './fake-figma.testing.js';
import { createRunner } from './runner.js';

const flat = async (node: { id: string; name: string; type: string }, created: boolean): Promise<NodeSnapshot> => ({
  id: node.id,
  name: node.name,
  type: node.type,
  parentId: null,
  frame: null,
  created,
  fills: [],
  strokes: [],
  textStyleId: null,
  instance: null,
  spacing: [],
});

function setup(): { figma: FakeFigma; posted: PluginMessage[]; runner: ReturnType<typeof createRunner> } {
  const figma = new FakeFigma();
  const posted: PluginMessage[] = [];
  const runner = createRunner(
    {
      figma: figma as never,
      snapshot: flat as never,
      holdTimer: { set: (fn, ms) => setTimeout(fn, ms), clear: clearTimeout },
    },
    (message) => posted.push(message),
  );
  return { figma, posted, runner };
}

const run = (script: string, holdMs = 1000) => ({ type: 'run', runId: 'r1', script, timeoutMs: 1000, holdMs }) as const;

describe('the sandbox runner', () => {
  it('records the nodes a script creates and holds them pending', async () => {
    const { posted, runner, figma } = setup();
    await runner.receive(run('const r = figma.createRectangle(); return r.id;'));
    expect(posted[0]).toMatchObject({ type: 'ran', created: ['1:10'], value: '1:10' });
    expect(figma.nodes.has('1:10')).toBe(true);
  });

  it('removes every created node on rollback, and names the changed ones it cannot undo', async () => {
    const { posted, runner, figma } = setup();
    const old = figma.existing('Header');
    await runner.receive(run(`figma.createRectangle(); (await figma.getNodeByIdAsync('${old.id}')).rename('Top');`));
    await runner.receive({ type: 'decide', runId: 'r1', decision: 'rollback' });
    expect(figma.nodes.has('1:11')).toBe(false);
    expect(posted.at(-1)).toEqual({ type: 'settled', runId: 'r1', outcome: 'rolled-back', untouchable: [old.id] });
  });

  it('commits undo on commit', async () => {
    const { posted, runner, figma } = setup();
    await runner.receive(run('figma.createRectangle();'));
    const before = figma.undoCommits;
    await runner.receive({ type: 'decide', runId: 'r1', decision: 'commit' });
    expect(figma.undoCommits).toBe(before + 1);
    expect(posted.at(-1)).toMatchObject({ type: 'settled', outcome: 'committed' });
  });

  it('rolls back a thrown script at once', async () => {
    const { posted, runner, figma } = setup();
    await runner.receive(run('figma.createRectangle(); throw new Error("boom");'));
    expect(posted).toEqual([{ type: 'threw', runId: 'r1', error: 'Error: boom', untouchable: [] }]);
    expect([...figma.nodes.keys()]).toEqual([]);
  });

  it('rolls back on its own when no decision comes', async () => {
    const { posted, runner, figma } = setup();
    await runner.receive(run('figma.createRectangle();', 30));
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(posted.at(-1)).toMatchObject({ type: 'settled', outcome: 'rolled-back' });
    expect(figma.nodes.size).toBe(0);
  });

  it('rolls back a run that returns after the server gave up', async () => {
    const { posted, runner, figma } = setup();
    const pending = runner.receive(run('figma.createRectangle(); await new Promise((r) => setTimeout(r, 40));'));
    await runner.receive({ type: 'decide', runId: 'r1', decision: 'rollback' });
    await pending;
    expect(figma.nodes.size).toBe(0);
    expect(posted.map((m) => m.type)).toEqual(['settled']);
  });

  it('stops recording when the run ends', async () => {
    const { posted, runner, figma } = setup();
    await runner.receive(run('return 1;'));
    await runner.receive({ type: 'decide', runId: 'r1', decision: 'commit' });
    figma.createRectangle();
    await runner.receive(run('return 2;'));
    expect(posted.at(-1)).toMatchObject({ type: 'ran', created: [] });
  });

  it('answers threw and removes what the script made when the snapshot fails', async () => {
    const figma = new FakeFigma();
    const posted: PluginMessage[] = [];
    const runner = createRunner(
      {
        figma: figma as never,
        snapshot: async () => {
          throw new Error('snapshot failed');
        },
        holdTimer: { set: (fn, ms) => setTimeout(fn, ms), clear: clearTimeout },
      },
      (message) => posted.push(message),
    );
    await runner.receive(run('figma.createRectangle();'));
    expect(posted).toEqual([{ type: 'threw', runId: 'r1', error: 'Error: snapshot failed', untouchable: [] }]);
    expect(figma.nodes.size).toBe(0);
  });

  it('rolls back a held change when the next run starts', async () => {
    const { posted, runner, figma } = setup();
    await runner.receive({
      type: 'run',
      runId: 'a',
      script: 'figma.createRectangle();',
      timeoutMs: 1000,
      holdMs: 1000,
    });
    await runner.receive({ type: 'run', runId: 'b', script: 'return 2;', timeoutMs: 1000, holdMs: 1000 });
    expect(posted.map((m) => [m.type, 'runId' in m ? m.runId : ''])).toEqual([
      ['ran', 'a'],
      ['settled', 'a'],
      ['ran', 'b'],
    ]);
    expect(posted[1]).toMatchObject({ outcome: 'rolled-back' });
    expect(figma.nodes.size).toBe(0);
  });

  it('queues a run that arrives while the one the server gave up on still runs', async () => {
    const { posted, runner, figma } = setup();
    const slow = 'figma.createRectangle(); await new Promise((r) => setTimeout(r, 40));';
    const first = runner.receive({ type: 'run', runId: 'a', script: slow, timeoutMs: 1000, holdMs: 1000 });
    await runner.receive({ type: 'decide', runId: 'a', decision: 'rollback' });
    const second = runner.receive({
      type: 'run',
      runId: 'b',
      script: 'figma.createFrame();',
      timeoutMs: 1000,
      holdMs: 1000,
    });
    await Promise.all([first, second]);
    await runner.receive({ type: 'decide', runId: 'b', decision: 'commit' });
    expect(posted.map((m) => [m.type, 'runId' in m ? m.runId : ''])).toEqual([
      ['settled', 'a'],
      ['ran', 'b'],
      ['settled', 'b'],
    ]);
    expect(posted.at(-1)).toMatchObject({ outcome: 'committed' });
    expect([...figma.nodes.values()].map((n) => n.type)).toEqual(['FRAME']);
  });

  it('rolls back when the rollback arrives while the change is being snapshotted', async () => {
    const figma = new FakeFigma();
    const posted: PluginMessage[] = [];
    let release!: () => void;
    const runner = createRunner(
      {
        figma: figma as never,
        snapshot: async (node, created) => {
          await new Promise<void>((resolve) => (release = resolve));
          return flat(node, created);
        },
        holdTimer: { set: (fn, ms) => setTimeout(fn, ms), clear: clearTimeout },
      },
      (message) => posted.push(message),
    );
    const running = runner.receive(run('figma.createRectangle();'));
    await new Promise((resolve) => setTimeout(resolve, 10));
    await runner.receive({ type: 'decide', runId: 'r1', decision: 'rollback' });
    release();
    await running;
    expect(posted.map((m) => m.type)).toEqual(['settled']);
    expect(figma.nodes.size).toBe(0);
  });

  it('records and rolls back a node made without a create* call', async () => {
    const { posted, runner, figma } = setup();
    await runner.receive(run('return figma.instantiate().id;'));
    expect(posted[0]).toMatchObject({ type: 'ran', created: ['1:10'] });
    await runner.receive({ type: 'decide', runId: 'r1', decision: 'rollback' });
    expect(figma.nodes.size).toBe(0);
  });

  it('names the existing nodes a thrown script changed', async () => {
    const { posted, runner, figma } = setup();
    const old = figma.existing('Header');
    await runner.receive(run(`(await figma.getNodeByIdAsync('${old.id}')).rename('Top'); throw new Error('boom');`));
    expect(posted).toEqual([{ type: 'threw', runId: 'r1', error: 'Error: boom', untouchable: [old.id] }]);
  });
  it('checks the nodes a script creates and not the text styles it creates, which are not on a page', async () => {
    const { posted, runner, figma } = setup();
    await runner.receive(run('figma.createTextStyle(); figma.createFrame();'));
    expect(posted[0]).toMatchObject({ type: 'ran', snapshot: [{ type: 'FRAME' }] });
    await runner.receive({ type: 'decide', runId: 'r1', decision: 'rollback' });
    expect(figma.styles.size).toBe(0);
  });

  it('checks the set that holds a created variant, though its creation was heard on no page', async () => {
    const { posted, runner } = setup();
    await runner.receive(
      run(
        'const a = figma.createComponent(); const b = figma.createComponent(); return figma.combineElsewhere([a, b]).id;',
      ),
    );
    const ran = posted[0] as Extract<PluginMessage, { type: 'ran' }>;
    expect(ran.snapshot.map((node) => [node.type, node.created])).toEqual([
      ['COMPONENT', true],
      ['COMPONENT', true],
      ['COMPONENT_SET', false],
    ]);
  });
});
