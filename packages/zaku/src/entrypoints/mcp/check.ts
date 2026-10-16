import type { FigmaBridge, Session } from '../../lib/adapters/figma-bridge.js';
import { cutFindings, type CutFindings } from '../../lib/domain/cut-findings.js';
import { snapshotFindings } from '../../lib/domain/snapshot-rules.js';
import type { CheckScope } from '../../lib/schema/bridge.js';
import type { CopyConfig } from '../../lib/schema/zaku-config.js';

/**
 * Snapshots the scope, runs the rules over it, and shows the findings in the plugin. It waits its turn
 * behind an execute on the same file, whose held nodes would otherwise be checked and then rolled back.
 * `copy` is the zaku.yaml copy section of the session the check is for, as run_script reads it. The plugin shows
 * every finding; the answer counts every one and lists those that fit a reply, since a page drawn from kits
 * can hold more findings than a tool result carries.
 */
export async function runCheck(
  bridge: FigmaBridge,
  session: Session,
  scope: CheckScope,
  copy?: CopyConfig,
): Promise<CutFindings> {
  return bridge.exclusive(session, async () => {
    const snapshot = await bridge.snapshot(session, scope);
    const findings = snapshotFindings(snapshot, copy);
    bridge.push(session, { type: 'findings', findings });
    return cutFindings(snapshot.length, findings);
  });
}
