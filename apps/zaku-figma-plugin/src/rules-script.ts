import { snapshotFindings, type Finding, type ResolvedCopy } from '@zeroxsolutions/zaku/rules';
import { snapshotNode, type AncestryCache } from './sandbox/snapshot.js';

/** use_figma cuts a reply at 20 KB; the result keeps a margin under it for the envelope the tool adds. */
export const REPLY_BYTES = 18_000;

export interface RulesOptions {
  /** A page by id or name, or one node and everything inside it. */
  scope: { page: string } | { nodeId: string };
  /** zaku.yaml's copy section, resolved by the CLI: the sandbox has no Intl to resolve a locale with. */
  copy: ResolvedCopy;
}

export interface RulesResult {
  checked: number;
  total: number;
  /** Findings per check id, every one counted. */
  counts: Record<string, number>;
  /** The first findings, as many as fit the reply. */
  findings: Finding[];
  /** True when `findings` holds fewer than `total`. */
  cut: boolean;
}

// The Plugin API global, which use_figma and the plugin sandbox each hand in.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- a structural Plugin API reference
type Figma = any;

/** The nodes a check reads: one node and everything inside it, or one page, the current one for `true`. */
export async function scopeNodes(figma: Figma, scope: RulesOptions['scope'] | { page: true }): Promise<SceneNode[]> {
  if ('nodeId' in scope) {
    const node = await figma.getNodeByIdAsync(scope.nodeId);
    if (!node || node.type === 'PAGE' || node.type === 'DOCUMENT') return [];
    return 'findAll' in node ? [node, ...node.findAll()] : [node];
  }
  if (scope.page !== true) {
    const wanted = scope.page;
    const pages: { id: string; name: string }[] = figma.root.children;
    const page = pages.find((candidate) => candidate.id === wanted || candidate.name === wanted);
    if (!page) throw new Error(`no page ${wanted}; the pages are ${pages.map((p) => p.name).join(', ')}`);
    if (page !== figma.currentPage) await figma.setCurrentPageAsync(page);
  }
  return figma.currentPage.findAll();
}

/** The UTF-8 length of a value's JSON; the Plugin API sandbox has no TextEncoder. */
function bytes(value: unknown): number {
  return encodeURIComponent(JSON.stringify(value)).replace(/%[0-9A-F]{2}/g, 'x').length;
}

/** Runs zaku's rules over the scope inside Figma, and answers what fits a use_figma reply. */
export async function zakuRules(figma: Figma, options: RulesOptions): Promise<RulesResult> {
  const nodes = await scopeNodes(figma, options.scope);
  const cache: AncestryCache = new Map();
  const snapshot = await Promise.all(nodes.map((node) => snapshotNode(node, false, figma.mixed, cache)));
  const all = snapshotFindings(snapshot, options.copy);
  const counts: Record<string, number> = {};
  for (const finding of all) counts[finding.check] = (counts[finding.check] ?? 0) + 1;
  const result: RulesResult = { checked: snapshot.length, total: all.length, counts, findings: [], cut: false };
  // Each finding adds its own bytes and a comma to the result with none.
  let size = bytes(result);
  for (const finding of all) {
    size += bytes(finding) + 1;
    if (size > REPLY_BYTES) {
      result.cut = true;
      break;
    }
    result.findings.push(finding);
  }
  return result;
}
