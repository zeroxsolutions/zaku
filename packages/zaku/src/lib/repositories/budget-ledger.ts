import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Budget } from '../schema/zaku-config.js';

export type CallKind = 'mcp' | 'rest';

export interface SeatCount {
  mcp: number;
  rest: number;
  runs: Record<string, number>;
}

export interface Ledger {
  day: string;
  seats: Record<string, SeatCount>;
}

export function ledgerPath(env: Record<string, string | undefined>, platform: string, home: string): string {
  const cache =
    env['XDG_CACHE_HOME'] ?? (platform === 'darwin' ? join(home, 'Library', 'Caches') : join(home, '.cache'));
  return join(cache, 'zaku', 'ledger.json');
}

export function today(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function seatAndRun(env: Record<string, string | undefined>): { seat: string; run: string } {
  return { seat: env['ZAKU_SEAT'] ?? 'default', run: env['ZAKU_RUN'] ?? 'default' };
}

export async function readLedger(path: string, day: string): Promise<Ledger> {
  try {
    const parsed = JSON.parse(await readFile(path, 'utf8')) as Ledger;
    const isCount = (seat: unknown): boolean => {
      const count = seat as Partial<SeatCount> | null;
      return (
        typeof count === 'object' &&
        count !== null &&
        typeof count.mcp === 'number' &&
        typeof count.rest === 'number' &&
        typeof count.runs === 'object' &&
        count.runs !== null &&
        Object.values(count.runs).every((value) => typeof value === 'number')
      );
    };
    const seats = typeof parsed.seats === 'object' && parsed.seats !== null ? Object.values(parsed.seats) : null;
    if (parsed.day === day && seats !== null && seats.every(isCount)) return parsed;
  } catch {
    // A missing or unreadable ledger is a fresh one: blocking every hook on it would cost more than a recount.
  }
  return { day, seats: {} };
}

export async function recordCalls(
  path: string,
  entry: { day: string; seat: string; run: string; kind: CallKind; count: number },
): Promise<Ledger> {
  const ledger = await readLedger(path, entry.day);
  const seat = ledger.seats[entry.seat] ?? { mcp: 0, rest: 0, runs: {} };
  seat[entry.kind] += entry.count;
  if (entry.kind === 'mcp') seat.runs[entry.run] = (seat.runs[entry.run] ?? 0) + entry.count;
  ledger.seats[entry.seat] = seat;
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(ledger)}\n`);
  await rename(temporary, path);
  return ledger;
}

export function mcpAllowance(
  ledger: Ledger,
  seat: string,
  run: string,
  budget: Budget,
): { ok: boolean; usedToday: number; usedThisRun: number; reason: string | null } {
  const count = ledger.seats[seat];
  const usedToday = count?.mcp ?? 0;
  const usedThisRun = count?.runs[run] ?? 0;
  const dayLimit = Math.floor(budget.mcpPerDay * (1 - budget.reserve));
  let reason: string | null = null;
  if (usedToday >= dayLimit)
    reason = `the day's reserve is reached: ${usedToday} of ${budget.mcpPerDay} MCP calls used`;
  else if (usedThisRun >= budget.mcpPerRun) reason = `this run reached its ceiling of ${budget.mcpPerRun} MCP calls`;
  return { ok: reason === null, usedToday, usedThisRun, reason };
}

export interface IBudgetLedger {
  record(entry: { day: string; seat: string; run: string; kind: CallKind; count: number }): Promise<void>;
  read(day: string): Promise<Ledger>;
}

/** The seat's ledger file; the entrypoint constructs it with the path it derives from the environment. */
export class FileBudgetLedger implements IBudgetLedger {
  constructor(private readonly path: string) {}

  async record(entry: { day: string; seat: string; run: string; kind: CallKind; count: number }): Promise<void> {
    await recordCalls(this.path, entry);
  }

  read(day: string): Promise<Ledger> {
    return readLedger(this.path, day);
  }
}
