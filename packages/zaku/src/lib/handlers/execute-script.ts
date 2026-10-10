import type { ICommandHandler } from '@zeroxsolutions/cosmic';
import { inject, injectable } from 'tsyringe';
import { z } from 'zod';
import type { FigmaBridge } from '../adapters/figma-bridge.js';
import { ExecuteScript } from '../commands/index.js';
import { TOKENS } from '../constants/index.js';
import { ScriptRefused } from '../domain/errors/index.js';
import { findingSchema } from '../domain/findings.js';
import { cutIdsSchema, cutReply } from '../domain/reply-cut.js';
import { refusedCalls } from '../domain/script-refusal.js';
import { snapshotFindings } from '../domain/snapshot-rules.js';
import type { IDesignConfigRepository } from '../repositories/design-config-repository.js';

const idsSchema = z.union([z.array(z.string()), cutIdsSchema]);

/** A run the plugin settled, or rolled back after the script threw or ran out of time. */
export const settledRunSchema = z
  .object({
    outcome: z
      .enum(['committed', 'rolled-back', 'partly-rolled-back'])
      .describe('committed keeps the change; rolled-back undid it; partly-rolled-back left the nodes in left'),
    reason: z.enum(['findings', 'threw', 'timeout']).optional().describe('Why the run rolled back'),
    left: z.array(z.string()).optional().describe('Nodes the run made that the plugin could not remove'),
    error: z.string().optional().describe('What the script threw'),
    message: z.string().optional().describe('Set when what the file now holds is not certain'),
    value: z.unknown().describe("The script's return value, as JSON"),
    created: idsSchema.describe('The ids of the nodes the script created'),
    mutated: idsSchema.describe('The ids of the nodes that existed before and that the script changed'),
    findings: z.array(findingSchema).describe('What broke a rule, among the nodes the script touched'),
    untouchable: z.array(z.string()).describe('Changed nodes a rollback could not restore'),
    findingCounts: z.record(z.string(), z.number().int()).optional().describe('On a cut reply: findings by check'),
    untouchableCount: z.number().int().optional().describe('On a cut reply: how many untouchable ids there were'),
    cut: z.literal(true).optional().describe('Set when the reply was cut to stay under its size limit'),
  })
  .strict();

/** The plugin dropped, or did not confirm it gave up a timed-out run, so whether the change was kept is not known. */
export const lostRunSchema = z
  .object({
    outcome: z.literal('unknown'),
    reason: z.literal('timeout').optional(),
    message: z.string().describe('What to do before retrying'),
  })
  .strict();

export type ExecuteResult = z.output<typeof settledRunSchema> | z.output<typeof lostRunSchema>;

const UNKNOWN = { outcome: 'unknown', message: 'call read_nodes before running it again' } as const;

/** The outcome of a rollback, true to what the plugin removed: nodes it could not remove are named, not called gone. */
const rolledBack = (left: string[]): { outcome: 'rolled-back' } | { outcome: 'partly-rolled-back'; left: string[] } =>
  left.length > 0 ? { outcome: 'partly-rolled-back', left } : { outcome: 'rolled-back' };

/** Handles ExecuteScript: refuse, run, check the snapshot, then commit or roll back, one run per file at a time. */
@injectable({ token: TOKENS.COMMAND_HANDLER })
export class ExecuteScriptHandler implements ICommandHandler<ExecuteScript, ExecuteResult> {
  readonly command = ExecuteScript;

  constructor(
    @inject(TOKENS.FIGMA_BRIDGE) private readonly bridge: FigmaBridge,
    @inject(TOKENS.DESIGN_CONFIG_REPOSITORY) private readonly configs: Pick<IDesignConfigRepository, 'readOptional'>,
  ) {}

  async handle(command: ExecuteScript): Promise<ExecuteResult> {
    const refused = refusedCalls(command.script);
    if (refused.length > 0) throw new ScriptRefused(refused);
    const config = await this.configs.readOptional(command.designRoot);
    const session = this.bridge.session(command.file);
    return this.bridge.exclusive(session, async (): Promise<ExecuteResult> => {
      const ran = await this.bridge.run(session, command.script);
      if (ran.kind === 'dropped') return UNKNOWN;
      const empty = { value: null, created: [], mutated: [], findings: [], untouchable: [] };
      if (ran.kind === 'threw')
        return {
          ...rolledBack(ran.left),
          reason: 'threw',
          error: ran.error,
          ...empty,
          untouchable: ran.untouchable,
        };
      if (ran.kind === 'timeout') {
        const budget = `${Math.round(ran.budgetMs / 1000)} s`;
        if (ran.settled === null)
          return {
            outcome: 'unknown',
            reason: 'timeout',
            message: `the script ran past the ${budget} budget and the plugin did not confirm it gave it up; call read_nodes before running it again`,
          };
        return {
          ...rolledBack(ran.settled.left),
          reason: 'timeout',
          message: `the script ran past the ${budget} budget and was given up: what it made is removed, and untouchable names the nodes that already existed which it changed. Split the work into scripts that each finish well inside ${budget}, one entry part per script.`,
          ...empty,
          untouchable: ran.settled.untouchable,
        };
      }
      const findings = snapshotFindings(ran.snapshot, config?.copy);
      const decision = command.mode === 'strict' && findings.length > 0 ? 'rollback' : 'commit';
      const settled = await this.bridge.decide(session, ran.runId, decision);
      if (settled.kind === 'dropped') return UNKNOWN;
      this.bridge.push(session, { type: 'findings', findings });
      const parents = Object.fromEntries(ran.snapshot.map((node) => [node.id, node.parentId]));
      return cutReply({
        ...(settled.outcome === 'rolled-back' ? rolledBack(settled.left) : { outcome: settled.outcome }),
        ...(decision === 'rollback' ? { reason: 'findings' as const } : {}),
        value: ran.value,
        created: ran.created,
        mutated: ran.mutated,
        findings,
        untouchable: settled.untouchable,
        snapshotParents: parents,
      }) as ExecuteResult;
    });
  }
}
