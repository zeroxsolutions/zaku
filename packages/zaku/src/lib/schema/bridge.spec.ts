import { pluginMessageSchema, serverMessageSchema } from './bridge.js';

const hello = {
  type: 'hello',
  file: 'Ant Design',
  pages: [{ id: '0:1', name: 'Cover' }],
  currentPage: '0:1',
  selection: [],
  pluginVersion: '0.1.0',
  user: 'Tu',
  credential: { code: '12345678' },
};

describe('the bridge messages', () => {
  it('reads a hello', () => {
    expect(pluginMessageSchema.parse(hello)).toEqual(hello);
  });

  it('reads a run result carrying a snapshot', () => {
    const ran = {
      type: 'ran',
      runId: 'r1',
      ok: true,
      value: { id: '1:2' },
      created: ['1:2'],
      mutated: [],
      snapshot: [
        {
          id: '1:2',
          name: 'Card',
          type: 'FRAME',
          parentId: '0:1',
          frame: null,
          created: true,
          fills: [{ bound: false }],
          strokes: [],
          textStyleId: null,
          instance: null,
          spacing: [{ field: 'itemSpacing', value: 8, bound: false }],
        },
      ],
    };
    expect(pluginMessageSchema.parse(ran)).toEqual(ran);
  });

  it('reads a hello that presents a token', () => {
    const later = { ...hello, credential: { token: 'abc' } };
    expect(pluginMessageSchema.parse(later)).toEqual(later);
  });

  it('refuses a hello that presents no credential', () => {
    expect(pluginMessageSchema.safeParse({ ...hello, credential: undefined }).success).toBe(false);
  });

  it('reads the panel asking to unpair', () => {
    expect(pluginMessageSchema.parse({ type: 'unpair' })).toEqual({ type: 'unpair' });
  });

  it('refuses a message of a type it does not know', () => {
    expect(pluginMessageSchema.safeParse({ type: 'hi' }).success).toBe(false);
  });

  it('reads every message the server sends', () => {
    for (const message of [
      { type: 'run', runId: 'r1', script: 'return 1', timeoutMs: 30000, holdMs: 60000 },
      { type: 'decide', runId: 'r1', decision: 'commit' },
      { type: 'read', requestId: 'q1', target: { nodeId: '1:2' }, depth: 2 },
      { type: 'snapshot', requestId: 'q2', scope: { page: true } },
      { type: 'findings', findings: [{ check: 'binding', message: 'x', nodeId: '1:2' }] },
      { type: 'select', nodeId: '1:2' },
      { type: 'paired', token: 'abc' },
      { type: 'refused', reason: 'wrong-code' },
      { type: 'refused', reason: 'expired-code' },
      { type: 'refused', reason: 'used-up-code' },
      { type: 'refused', reason: 'unknown-token' },
    ]) {
      expect(serverMessageSchema.parse(message)).toEqual(message);
    }
  });
});
