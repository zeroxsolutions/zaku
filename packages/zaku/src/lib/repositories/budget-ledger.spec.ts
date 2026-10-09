import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ledgerPath, mcpAllowance, readLedger, recordCalls } from './budget-ledger.js';

const budget = { mcpPerDay: 200, mcpPerRun: 30, reserve: 0.2 };

describe('ledgerPath', () => {
  it('uses XDG_CACHE_HOME, then the platform cache directory', () => {
    expect(ledgerPath({ XDG_CACHE_HOME: '/c' }, 'linux', '/h')).toBe('/c/zaku/ledger.json');
    expect(ledgerPath({}, 'darwin', '/h')).toBe('/h/Library/Caches/zaku/ledger.json');
    expect(ledgerPath({}, 'linux', '/h')).toBe('/h/.cache/zaku/ledger.json');
  });
});

describe('the ledger', () => {
  it('counts calls per seat and per run, and starts again on a new day', async () => {
    const path = join(await mkdtemp(join(tmpdir(), 'zaku-')), 'zaku', 'ledger.json');
    await recordCalls(path, { day: '2026-10-07', seat: 's', run: 'r1', kind: 'mcp', count: 3 });
    const ledger = await recordCalls(path, {
      day: '2026-10-07',
      seat: 's',
      run: 'r1',
      kind: 'rest',
      count: 2,
    });
    expect(ledger.seats['s']).toEqual({ mcp: 3, rest: 2, runs: { r1: 3 } });
    expect((await readLedger(path, '2026-10-08')).seats).toEqual({});
  });

  it('starts fresh from a file that is not valid JSON', async () => {
    const path = join(await mkdtemp(join(tmpdir(), 'zaku-')), 'ledger.json');
    await writeFile(path, '{not json');
    expect(await readLedger(path, '2026-10-07')).toEqual({ day: '2026-10-07', seats: {} });
  });
});

describe('mcpAllowance', () => {
  it('refuses at the day reserve and at the run ceiling, naming which', () => {
    const at = (mcp: number, run: number): ReturnType<typeof mcpAllowance> =>
      mcpAllowance({ day: 'd', seats: { s: { mcp, rest: 0, runs: { r: run } } } }, 's', 'r', budget);
    expect(at(10, 10).ok).toBe(true);
    expect(at(160, 0)).toEqual({
      ok: false,
      usedToday: 160,
      usedThisRun: 0,
      reason: "the day's reserve is reached: 160 of 200 MCP calls used",
    });
    expect(at(40, 30).reason).toBe('this run reached its ceiling of 30 MCP calls');
  });
});

describe('a ledger of the wrong shape', () => {
  it('starts fresh from valid JSON that lacks a seat field', async () => {
    const path = join(await mkdtemp(join(tmpdir(), 'zaku-')), 'ledger.json');
    await writeFile(path, JSON.stringify({ day: '2026-10-07', seats: { default: { mcp: 1 } } }));
    expect(await readLedger(path, '2026-10-07')).toEqual({ day: '2026-10-07', seats: {} });
  });
});
