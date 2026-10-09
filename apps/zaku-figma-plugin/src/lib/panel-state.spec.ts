import { INITIAL_PANEL_STATE, panelReducer, type PanelEvent, type PanelState } from './panel-state.js';

const run = (...events: PanelEvent[]): PanelState => events.reduce(panelReducer, INITIAL_PANEL_STATE);
const connected: PanelEvent = { kind: 'status', status: 'connected' };
const execute: PanelEvent = {
  kind: 'to-sandbox',
  now: 5,
  message: { type: 'run', runId: 'r', script: '', timeoutMs: 1, holdMs: 1 },
};

describe('panelReducer', () => {
  it('starts disconnected, with no file, nothing running and nothing checked yet', () => {
    expect(INITIAL_PANEL_STATE).toEqual({
      status: 'disconnected',
      file: null,
      running: null,
      findings: null,
      error: null,
    });
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
});
