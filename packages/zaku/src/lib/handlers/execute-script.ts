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

export type ExecuteResult =
  | {
      outcome: 'committed' | 'rolled-back';
      reason?: 'findings' | 'threw' | 'timeout';
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
  | { outcome: 'unknown'; message: 'read before retrying' };

const UNKNOWN = { outcome: 'unknown', message: 'read before retrying' } as const;

/** Handles ExecuteScript: refuse, run, check the snapshot, then commit or roll back, one run per file at a time. */
@injectable({ token: TOKENS.COMMAND_HANDLER })
export class ExecuteScriptHandler implements ICommandHandler<ExecuteScript, ExecuteResult> {
  readonly command = ExecuteScript;

  constructor(@inject(TOKENS.FIGMA_BRIDGE) private readonly bridge: FigmaBridge) {}

  async handle(command: ExecuteScript): Promise<ExecuteResult> {
    const refused = refusedCalls(command.script);
    if (refused.length > 0) throw new ScriptRefused(refused);
    const session = this.bridge.session(command.file);
    return this.bridge.exclusive(session, async (): Promise<ExecuteResult> => {
      const ran = await this.bridge.run(session, command.script);
      if (ran.kind === 'dropped') return UNKNOWN;
      const empty = { value: null, created: [], mutated: [], findings: [], untouchable: [] };
      if (ran.kind === 'threw')
        return { outcome: 'rolled-back', reason: 'threw', error: ran.error, ...empty, untouchable: ran.untouchable };
      if (ran.kind === 'timeout')
        return {
          outcome: 'rolled-back',
          reason: 'timeout',
          // The script may still be running; what it changed on nodes that already existed is not known yet.
          message: 'the script may have changed nodes that already existed; read before retrying',
          ...empty,
        };
      const findings = snapshotFindings(ran.snapshot);
      const decision = command.mode === 'strict' && findings.length > 0 ? 'rollback' : 'commit';
      const settled = await this.bridge.decide(session, ran.runId, decision);
      if (settled.kind === 'dropped') return UNKNOWN;
      this.bridge.push(session, { type: 'findings', findings });
      const parents = Object.fromEntries(ran.snapshot.map((node) => [node.id, node.parentId]));
      return cutReply({
        outcome: settled.outcome,
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
