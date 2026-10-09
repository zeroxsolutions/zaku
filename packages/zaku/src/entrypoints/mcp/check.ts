import type { FigmaBridge, Session } from '../../lib/adapters/figma-bridge.js';
import { snapshotFindings } from '../../lib/domain/snapshot-rules.js';
import type { CheckScope } from '../../lib/schema/bridge.js';

/**
 * Snapshots the scope, runs the rules over it, and shows the findings in the plugin. It waits its turn
 * behind an execute on the same file, whose held nodes would otherwise be checked and then rolled back.
 */
export async function runCheck(
  bridge: FigmaBridge,
  session: Session,
  scope: CheckScope,
): Promise<{ checked: number; findings: ReturnType<typeof snapshotFindings> }> {
  return bridge.exclusive(session, async () => {
    const snapshot = await bridge.snapshot(session, scope);
    const findings = snapshotFindings(snapshot);
    bridge.push(session, { type: 'findings', findings });
    return { checked: snapshot.length, findings };
  });
}
