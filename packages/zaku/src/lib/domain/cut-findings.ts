import type { Finding } from './findings.js';

/** use_figma cuts a reply at 20 KB; an answer keeps a margin under it for the envelope a tool adds. */
export const REPLY_BYTES = 18_000;

/** A rules run as a reply carries it: every finding counted, the first ones listed. */
export type CutFindings = {
  checked: number;
  total: number;
  /** Findings per check id, every one counted. */
  counts: Record<string, number>;
  /** The first findings, as many as fit the reply. */
  findings: Finding[];
  /** True when `findings` holds fewer than `total`. */
  cut: boolean;
};

/** The UTF-8 length of a value's JSON; the Plugin API sandbox has no TextEncoder. */
function bytes(value: unknown): number {
  return encodeURIComponent(JSON.stringify(value)).replace(/%[0-9A-F]{2}/g, 'x').length;
}

/** Counts every finding and keeps the first ones whose JSON fits in `budget` bytes with the counts. */
export function cutFindings(checked: number, all: readonly Finding[], budget = REPLY_BYTES): CutFindings {
  const counts: Record<string, number> = {};
  for (const finding of all) counts[finding.check] = (counts[finding.check] ?? 0) + 1;
  const result: CutFindings = { checked, total: all.length, counts, findings: [], cut: false };
  // Each finding adds its own bytes and a comma to the result with none.
  let size = bytes(result);
  for (const finding of all) {
    size += bytes(finding) + 1;
    if (size > budget) {
      result.cut = true;
      break;
    }
    result.findings.push(finding);
  }
  return result;
}
