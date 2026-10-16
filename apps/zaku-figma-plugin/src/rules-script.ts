import { cutFindings, snapshotFindings, type CutFindings, type ResolvedCopy } from '@zeroxsolutions/zaku/rules';
import { snapshotNode, type AncestryCache } from './sandbox/snapshot.js';

export { REPLY_BYTES } from '@zeroxsolutions/zaku/rules';

export interface RulesOptions {
  /** A page by id or name, or one node and everything inside it. */
  scope: { page: string } | { nodeId: string };
  /** zaku.yaml's copy section, resolved by the CLI: the sandbox has no Intl to resolve a locale with. */
  copy: ResolvedCopy;
}

export type RulesResult = CutFindings;

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

/** Runs zaku's rules over the scope inside Figma, and answers what fits a use_figma reply. */
export async function zakuRules(figma: Figma, options: RulesOptions): Promise<RulesResult> {
  const nodes = await scopeNodes(figma, options.scope);
  const cache: AncestryCache = new Map();
  const snapshot = await Promise.all(nodes.map((node) => snapshotNode(node, false, figma.mixed, cache)));
  return cutFindings(snapshot.length, snapshotFindings(snapshot, options.copy));
}
