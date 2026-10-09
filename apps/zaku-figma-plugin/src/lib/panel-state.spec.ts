import { INITIAL_PANEL_STATE, panelReducer, panelStatus, type PanelEvent, type PanelState } from './panel-state.js';

const run = (...events: PanelEvent[]): PanelState => events.reduce(panelReducer, INITIAL_PANEL_STATE);
const connected: PanelEvent = { kind: 'status', status: 'connected' };
const execute: PanelEvent = {
  kind: 'to-sandbox',
  now: 5,
  message: { type: 'run', runId: 'r', script: '', timeoutMs: 1, holdMs: 1 },
};

describe('panelReducer', () => {
  it('starts disconnected, with no file, nothing running, nothing checked, and no word on pairing yet', () => {
    expect(INITIAL_PANEL_STATE).toEqual({
      status: 'disconnected',
      pairing: { phase: 'checking' },
      file: null,
      running: null,
      findings: null,
      error: null,
    });
  });

  it('reads paired or not from the token the sandbox kept', () => {
    expect(run({ kind: 'from-sandbox', message: { type: 'stored-token', token: 't' } }).pairing).toEqual({
      phase: 'paired',
    });
    expect(run({ kind: 'from-sandbox', message: { type: 'stored-token', token: null } }).pairing).toEqual({
      phase: 'unpaired',
      refusal: null,
    });
  });

  it('turns paired when the server pairs the code', () => {
    const state = run({ kind: 'to-sandbox', now: 1, message: { type: 'paired', token: 't' } });
    expect(state.pairing).toEqual({ phase: 'paired' });
  });

  it('turns unpaired with the reason when the server refuses', () => {
    const state = run(
      { kind: 'from-sandbox', message: { type: 'stored-token', token: 't' } },
      { kind: 'to-sandbox', now: 1, message: { type: 'refused', reason: 'unknown-token' } },
    );
    expect(state.pairing).toEqual({ phase: 'unpaired', refusal: 'unknown-token' });
  });

  it('clears the last refusal when the user tries another code', () => {
    const state = run(
      { kind: 'to-sandbox', now: 1, message: { type: 'refused', reason: 'wrong-code' } },
      { kind: 'pair' },
    );
    expect(state.pairing).toEqual({ phase: 'unpaired', refusal: null });
  });

  it('forgets the file and its findings on unpair', () => {
    const state = run(
      { kind: 'from-sandbox', message: { type: 'stored-token', token: 't' } },
      { kind: 'to-sandbox', now: 1, message: { type: 'findings', findings: [] } },
      { kind: 'unpair' },
    );
    expect(state).toMatchObject({ pairing: { phase: 'unpaired', refusal: null }, file: null, findings: null });
  });

  it('shows an execute as running from its run until it settles', () => {
    const running = run(connected, execute);
    expect(running.running).toEqual({ command: 'execute', id: 'r', since: 5 });
    const done = panelReducer(running, {
      kind: 'from-sandbox',
      message: { type: 'settled', runId: 'r', outcome: 'committed', untouchable: [] },
    });
    expect(done.running).toBeNull();
  });

  it('ends an execute that threw', () => {
    const state = run(connected, execute, {
      kind: 'from-sandbox',
      message: { type: 'threw', runId: 'r', error: 'boom', untouchable: [] },
    });
    expect(state.running).toBeNull();
  });

  it('keeps an execute running past its ran, until the decision settles it', () => {
    const state = run(connected, execute, {
      kind: 'from-sandbox',
      message: { type: 'ran', runId: 'r', ok: true, value: null, created: [], mutated: [], snapshot: [] },
    });
    expect(state.running).toMatchObject({ command: 'execute' });
  });

  it('shows a read and a check as running until their result', () => {
    const read = run(connected, {
      kind: 'to-sandbox',
      now: 1,
      message: { type: 'read', requestId: 'q', target: { nodeId: '1:1' }, depth: 0 },
    });
    expect(read.running).toEqual({ command: 'read', id: 'q', since: 1 });
    const check = run(connected, {
      kind: 'to-sandbox',
      now: 2,
      message: { type: 'snapshot', requestId: 's', scope: { page: true } },
    });
    expect(check.running).toEqual({ command: 'check', id: 's', since: 2 });
    const other = panelReducer(check, { kind: 'from-sandbox', message: { type: 'read-result', requestId: 'q' } });
    expect(other.running).not.toBeNull();
    const done = panelReducer(check, { kind: 'from-sandbox', message: { type: 'read-result', requestId: 's' } });
    expect(done.running).toBeNull();
  });

  it('ends what was running when the connection drops', () => {
    const state = run(
      connected,
      { kind: 'to-sandbox', now: 1, message: { type: 'snapshot', requestId: 'q', scope: { page: true } } },
      { kind: 'status', status: 'reconnecting' },
    );
    expect(state).toMatchObject({ status: 'reconnecting', running: null });
  });

  it('names the file the sandbox says hello from', () => {
    const state = run(connected, {
      kind: 'from-sandbox',
      message: {
        type: 'hello',
        file: 'Acme',
        pages: [],
        currentPage: '0:1',
        selection: [],
        pluginVersion: '0.1.0',
        user: null,
      },
    });
    expect(state.file).toBe('Acme');
  });

  it('replaces the findings with each pushed set', () => {
    const first = run(connected, {
      kind: 'to-sandbox',
      now: 1,
      message: { type: 'findings', findings: [{ check: 'naming', message: 'Frame keeps a default name' }] },
    });
    expect(run(connected).findings).toBeNull();
    expect(first.findings).toHaveLength(1);
    const cleared = panelReducer(first, { kind: 'to-sandbox', now: 2, message: { type: 'findings', findings: [] } });
    expect(cleared.findings).toEqual([]);
  });

  it('shows a sandbox error', () => {
    const state = run(connected, { kind: 'from-sandbox', message: { type: 'sandbox-error', error: 'TypeError' } });
    expect(state.error).toBe('TypeError');
  });

  it('ignores a message it cannot parse', () => {
    const before = run(connected);
    expect(panelReducer(before, { kind: 'to-sandbox', now: 1, message: { type: 'nope' } })).toBe(before);
    expect(panelReducer(before, { kind: 'from-sandbox', message: 'garbage' })).toBe(before);
  });

  it('ends an execute the server gave up on, when it sends the decision', () => {
    const state = run(connected, execute, {
      kind: 'to-sandbox',
      now: 30,
      message: { type: 'decide', runId: 'r', decision: 'rollback' },
    });
    expect(state.running).toBeNull();
  });

  it('clears a sandbox error once the sandbox says hello again', () => {
    const state = run(
      connected,
      { kind: 'from-sandbox', message: { type: 'sandbox-error', error: 'TypeError' } },
      {
        kind: 'from-sandbox',
        message: {
          type: 'hello',
          file: 'Acme',
          pages: [],
          currentPage: '0:1',
          selection: [],
          pluginVersion: '0.1.0',
          user: null,
        },
      },
    );
    expect(state.error).toBeNull();
  });

  it('shows not paired over the socket state, and the socket state otherwise', () => {
    const unpaired = run(connected, { kind: 'from-sandbox', message: { type: 'stored-token', token: null } });
    expect(panelStatus(unpaired)).toBe('unpaired');
    const paired = run(connected, { kind: 'from-sandbox', message: { type: 'stored-token', token: 't' } });
    expect(panelStatus(paired)).toBe('connected');
    expect(panelStatus(run())).toBe('disconnected');
  });
});
