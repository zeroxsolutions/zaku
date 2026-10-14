import { z } from 'zod';
import { findingSchema } from './findings.js';

/** What `zaku rules script` answers through use_figma, as `zaku check --input` reads it back. */
export const rulesResultSchema = z
  .object({
    checked: z.number().int(),
    total: z.number().int(),
    counts: z.record(z.string(), z.number().int()),
    findings: z.array(findingSchema),
    cut: z.boolean(),
  })
  .strict();

export type RulesResult = z.output<typeof rulesResultSchema>;

/** One line per check whose findings the reply left out, so the run fixes what it saw and asks again. */
export function leftOut(result: RulesResult): string[] {
  if (!result.cut) return [];
  return Object.entries(result.counts).flatMap(([check, count]) => {
    const left = count - result.findings.filter((finding) => finding.check === check).length;
    return left > 0
      ? [`${left} more ${check} finding${left === 1 ? '' : 's'} the reply left out; fix these and run the script again`]
      : [];
  });
}
