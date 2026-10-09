import { ExecuteScript } from '../commands/index.js';
import type { FigmaBridge, RunOutcome, Session, Settled } from '../adapters/figma-bridge.js';
import { ScriptRefused } from '../domain/errors/index.js';
import type { IDesignConfigRepository } from '../repositories/design-config-repository.js';
import type { NodeSnapshot } from '../schema/bridge.js';
import { testConfig } from '../../test/fixtures.fixture.js';
import { ExecuteScriptHandler } from './execute-script.js';

function fakeBridge(
  run: RunOutcome,
  settled: Settled = { kind: 'settled', outcome: 'committed', untouchable: [] },
): { bridge: FigmaBridge; calls: string[]; pushed: unknown[] } {
  const calls: string[] = [];
  const pushed: unknown[] = [];
  const session = { file: 'A' } as Session;
  const bridge = {
    session: () => session,
    exclusive: <T>(_s: Session, work: () => Promise<T>) => work(),
    run: async () => {
      calls.push('run');
      return run;
    },
    decide: async (_s: Session, _id: string, decision: string) => {
      calls.push(decision);
      return decision === 'rollback' && settled.kind === 'settled'
        ? { ...settled, outcome: 'rolled-back' as const }
        : settled;
    },
    push: (_s: Session, message: unknown) => pushed.push(message),
  } as unknown as FigmaBridge;
  return { bridge, calls, pushed };
}

const ran = (snapshot: NodeSnapshot[]): RunOutcome => ({
  kind: 'ran',
  runId: 'r1',
  value: 'ok',
  created: ['1:1'],
  mutated: [],
  snapshot,
});

const clean = ran([]);
const unbound = ran([
  {
    id: '1:1',
    name: 'Card',
    type: 'FRAME',
    parentId: '0:1',
    frame: null,
    created: true,
    fills: [{ bound: false }],
    strokes: [],
    textStyleId: null,
    instance: null,
    spacing: [],
  },
]);

const command = (mode: 'strict' | 'report' = 'strict', script = 'return 1'): ExecuteScript =>
  new ExecuteScript({ file: undefined, script, mode, designRoot: 'docs/design' });

/** zaku.yaml as the repository reads it: absent, or with the copy section given. */
const configs = (copy?: unknown): Pick<IDesignConfigRepository, 'readOptional'> => ({
  readOptional: async () => (copy === undefined ? null : testConfig({ copy })),
});

const handler = (bridge: FigmaBridge, config = configs()): ExecuteScriptHandler =>
  new ExecuteScriptHandler(bridge, config);

describe('ExecuteScriptHandler', () => {
  it('commits a run with no findings', async () => {
    const { bridge, calls } = fakeBridge(clean);
    const result = await handler(bridge).handle(command());
    expect(calls).toEqual(['run', 'commit']);
    expect(result).toMatchObject({ outcome: 'committed', value: 'ok', findings: [] });
  });

  it('rolls back a run with a finding in strict mode', async () => {
    const { bridge, calls } = fakeBridge(unbound);
    const result = await handler(bridge).handle(command());
    expect(calls).toEqual(['run', 'rollback']);
    expect(result).toMatchObject({ outcome: 'rolled-back', reason: 'findings' });
  });

  it('keeps a run with a finding in report mode, and pushes the findings to the plugin', async () => {
    const { bridge, calls, pushed } = fakeBridge(unbound);
    const result = await handler(bridge).handle(command('report'));
    expect(calls).toEqual(['run', 'commit']);
    expect(result).toMatchObject({ outcome: 'committed', findings: [{ check: 'binding' }] });
    expect(pushed).toEqual([{ type: 'findings', findings: [expect.objectContaining({ check: 'binding' })] }]);
  });

  it('refuses a script before it reaches the file', async () => {
    const { bridge, calls } = fakeBridge(clean);
    await expect(handler(bridge).handle(command('strict', 'figma.closePlugin()'))).rejects.toThrow(ScriptRefused);
    expect(calls).toEqual([]);
  });

  it('answers a thrown script and a timeout as rolled back', async () => {
    expect(
      await handler(fakeBridge({ kind: 'threw', error: 'boom', untouchable: [] }).bridge).handle(command()),
    ).toMatchObject({ outcome: 'rolled-back', reason: 'threw', error: 'boom' });
    expect(await handler(fakeBridge({ kind: 'timeout' }).bridge).handle(command())).toMatchObject({
      outcome: 'rolled-back',
      reason: 'timeout',
    });
  });

  it('answers unknown when the connection drops before or during the decision', async () => {
    expect(await handler(fakeBridge({ kind: 'dropped' }).bridge).handle(command())).toEqual({
      outcome: 'unknown',
      message: 'read before retrying',
    });
    expect(await handler(fakeBridge(clean, { kind: 'dropped' }).bridge).handle(command())).toEqual({
      outcome: 'unknown',
      message: 'read before retrying',
    });
  });

  it('names the existing nodes a thrown script changed, and warns that a timed-out one may have', async () => {
    const threw = await handler(fakeBridge({ kind: 'threw', error: 'boom', untouchable: ['9:1'] }).bridge).handle(
      command(),
    );
    expect(threw).toMatchObject({ outcome: 'rolled-back', reason: 'threw', untouchable: ['9:1'] });
    const timedOut = await handler(fakeBridge({ kind: 'timeout' }).bridge).handle(command());
    expect(timedOut).toMatchObject({ outcome: 'rolled-back', reason: 'timeout' });
    expect((timedOut as { message?: string }).message).toMatch(/read before retrying/);
  });

  it('holds a text to the copy locales and currencies zaku.yaml names, and to English without one', async () => {
    const price = ran([
      {
        id: '1:2',
        name: 'Price',
        type: 'TEXT',
        parentId: '0:1',
        frame: null,
        created: true,
        fills: [],
        strokes: [],
        textStyleId: 's',
        characters: 'V\u00e9 120.000 \u20ab',
        instance: null,
        spacing: [],
      },
    ]);
    const priced = await handler(
      fakeBridge(price).bridge,
      configs({ locales: ['en', 'vi'], currencies: ['VND'] }),
    ).handle(command());
    expect(priced).toMatchObject({ outcome: 'committed', findings: [] });
    expect(await handler(fakeBridge(price).bridge).handle(command())).toMatchObject({
      outcome: 'rolled-back',
      findings: [{ check: 'copy', field: 'characters' }],
    });
  });
});
