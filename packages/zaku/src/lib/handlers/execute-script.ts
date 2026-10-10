import type { ICommandHandler } from '@zeroxsolutions/cosmic';
import { inject, injectable } from 'tsyringe';
import type { FigmaBridge } from '../adapters/figma-bridge.js';
import { ExecuteScript } from '../commands/index.js';
import { TOKENS } from '../constants/index.js';
import { ScriptRefused } from '../domain/errors/index.js';
import type { Finding } from '../domain/findings.js';
import { cutReply } from '../domain/reply-cut.js';
import { refusedCalls } from '../domain/script-refusal.js';
import { snapshotFindings } from '../domain/snapshot-rules.js';
import type { IDesignConfigRepository } from '../repositories/design-config-repository.js';

export type ExecuteResult =
  | {
      /** `partly-rolled-back`: the plugin could not remove every node the run made; `left` names those still in the file. */
      outcome: 'committed' | 'rolled-back' | 'partly-rolled-back';
      reason?: 'findings' | 'threw' | 'timeout';
      left?: string[];
      error?: string;
      /** Set when what the file now holds is not certain. */
      message?: string;
      value: unknown;
      created: unknown;
      mutated: unknown;
      findings: Finding[];
      untouchable: string[];
      cut?: true;
    }
  | { outcome: 'unknown'; reason?: 'timeout'; message: string };

const UNKNOWN = { outcome: 'unknown', message: 'read before retrying' } as const;

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
            message: `the script ran past the ${budget} budget and the plugin did not confirm it gave it up; read before retrying`,
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
