import { z } from 'zod';

export const REPLY_LIMIT = 20_000;

/** How many ids or findings a cut reply still lists. */
const LISTED = 20;

export interface CuttableReply {
  created: string[];
  mutated: string[];
  value: unknown;
  findings?: readonly { check: string }[];
  untouchable?: string[];
  /** Each created node's parent, so the cut can keep the roots. */
  snapshotParents?: Record<string, string | null>;
}

/** A cut reply's ids: how many there were, the first roots among them, and how many roots it left out. */
export const cutIdsSchema = z
  .object({ count: z.number().int(), roots: z.array(z.string()), more: z.number().int() })
  .strict()
  .describe('The ids counted, as the reply was cut: the first roots listed, more of them left out');

type CutIds = z.output<typeof cutIdsSchema>;

export type CutReply<T> = Omit<T, 'created' | 'mutated' | 'value' | 'snapshotParents'> & {
  created: CutIds;
  mutated: CutIds;
  value: unknown;
  findingCounts?: Record<string, number>;
  untouchableCount?: number;
  cut: true;
};

/** The length the tool prints, indented as it is. */
const printed = (value: unknown): number => JSON.stringify(value, null, 2)?.length ?? 0;

function cutIds(ids: readonly string[], parents: Record<string, string | null>): CutIds {
  const set = new Set(ids);
  const all = ids.filter((id) => {
    const parent = parents[id];
    return parent === undefined || parent === null || !set.has(parent);
  });
  return { count: ids.length, roots: all.slice(0, LISTED), more: all.length - Math.min(all.length, LISTED) };
}

function countByCheck(findings: readonly { check: string }[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const finding of findings) counts[finding.check] = (counts[finding.check] ?? 0) + 1;
  return counts;
}

/**
 * Keeps a reply under the limit as the tool prints it: past it the ids are counted and the first roots
 * listed, the findings counted by check and the first few listed, and a large value replaced by its size.
 */
export function cutReply<T extends CuttableReply>(
  reply: T,
  limit = REPLY_LIMIT,
): Omit<T, 'snapshotParents'> | CutReply<T> {
  const { snapshotParents, ...rest } = reply;
  if (printed(rest) < limit) return snapshotParents === undefined ? reply : rest;
  const parents = snapshotParents ?? {};
  const valueBytes = printed(reply.value ?? null);
  const cut: Record<string, unknown> = {
    ...rest,
    created: cutIds(reply.created, parents),
    mutated: cutIds(reply.mutated, parents),
    value: valueBytes < limit / 2 ? reply.value : { cut: true, bytes: valueBytes },
    cut: true,
  };
  if (reply.findings !== undefined && printed(reply.findings) >= limit / 4) {
    cut.findings = reply.findings.slice(0, LISTED);
    cut.findingCounts = countByCheck(reply.findings);
  }
  if (reply.untouchable !== undefined && reply.untouchable.length > LISTED) {
    cut.untouchable = reply.untouchable.slice(0, LISTED);
    cut.untouchableCount = reply.untouchable.length;
  }
  return cut as CutReply<T>;
}
