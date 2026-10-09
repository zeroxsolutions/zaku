import type { NodeSnapshot } from '../schema/bridge.js';
import { DEFAULT_COPY, type CopyConfig } from '../schema/zaku-config.js';
import { ALLOWED_OVERRIDES } from './checks/overrides.js';
import { copyIssues, copyPolicy } from './copy-rules.js';
import type { Finding } from './findings.js';
import { DEFAULT_LAYER_NAME } from './layer-names.js';

/** A library page holding one entry opens with U+2756 and a space, as building-the-library's Figma reference names it. */
const ENTRY_PAGE_PREFIX = '\u2756 ';
/** The library pages that hold only documentation: the cover and the documentation components. */
const DOCUMENTATION_PAGES: ReadonlySet<string> = new Set(['Thumbnail', 'Component for Docs']);
/** A box edge this close to another is touching, not overlapping. */
const EDGE_TOLERANCE = 0.01;

/**
 * Whether the node is the library's documentation, whose measures and type the reference writes as numbers:
 * anything on the cover or documentation-component page, and anything on an entry page outside its components.
 */
function isDocumentation(node: NodeSnapshot): boolean {
  const page = node.page?.name;
  if (page === undefined) return false;
  if (DOCUMENTATION_PAGES.has(page)) return true;
  return page.startsWith(ENTRY_PAGE_PREFIX) && node.componentSource === false;
}

type Box = { x: number; y: number; width: number; height: number };

function overlaps(a: Box, b: Box): boolean {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return width > EDGE_TOLERANCE && height > EDGE_TOLERANCE;
}

function outside(box: Box, width: number, height: number): boolean {
  return (
    box.x < -EDGE_TOLERANCE ||
    box.y < -EDGE_TOLERANCE ||
    box.x + box.width > width + EDGE_TOLERANCE ||
    box.y + box.height > height + EDGE_TOLERANCE
  );
}

/**
 * The rules an `execute` is held to, over what the script touched. `copy` is zaku.yaml's copy section; the
 * library copy the touched instances carry is allowed beside it, as zaku check allows it.
 */
export function snapshotFindings(nodes: readonly NodeSnapshot[], copy: CopyConfig = DEFAULT_COPY): Finding[] {
  const policy = copyPolicy(
    copy,
    nodes.flatMap((node) => node.instance?.carried ?? []),
  );
  const findings: Finding[] = [];
  for (const node of nodes) {
    const label = `${node.name} (${node.type.toLowerCase()})`;
    const finding = (check: Finding['check'], field: string | undefined, message: string, nodeId = node.id): void => {
      findings.push({
        check,
        nodeId,
        ...(field ? { field } : {}),
        ...(node.frame ? { frame: node.frame } : {}),
        message,
      });
    };
    const documentation = isDocumentation(node);
    if (node.fills.some((paint) => !paint.bound)) finding('binding', 'fill', `${label}: fill is a raw value`);
    if (node.strokes.some((paint) => !paint.bound)) finding('binding', 'stroke', `${label}: stroke is a raw value`);
    if (node.type === 'TEXT' && node.textStyleId === null && !documentation)
      finding('binding', 'textStyle', `${label}: text has no library text style`);
    for (const space of documentation ? [] : node.spacing) {
      if (space.value > 0 && !space.bound)
        finding('binding', space.field, `${label}: ${space.field} ${space.value} is not a spacing variable`);
    }
    if (
      (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') &&
      node.page?.name.startsWith(ENTRY_PAGE_PREFIX) &&
      node.parentId === node.page.id
    )
      finding('placement', undefined, `${label}: sits on the page, outside its entry's component view`);
    if (node.set) {
      const { width, height, variants } = node.set;
      variants.forEach((variant, i) => {
        for (const other of variants.slice(i + 1)) {
          if (overlaps(variant, other))
            finding('overlap', undefined, `${node.name}: ${variant.name} overlaps ${other.name}`, variant.id);
        }
        if (outside(variant, width, height))
          finding(
            'overlap',
            undefined,
            `${node.name}: ${variant.name} reaches past the set, which cuts it off`,
            variant.id,
          );
      });
    }
    if (node.characters !== undefined) {
      for (const issue of copyIssues(node.characters, policy))
        finding('copy', issue.field, `${label}: ${issue.message}`);
    }
    if (node.instance) {
      for (const override of node.instance.overrides) {
        if (override.characters !== undefined) {
          for (const issue of copyIssues(override.characters, policy))
            finding('copy', issue.field, `${node.name}: ${issue.message}`, override.nodeId);
        }
        for (const field of override.fields) {
          if (ALLOWED_OVERRIDES.has(field)) continue;
          // As zaku check: a picture is placed as an image fill, so that fill is content.
          if (field === 'fills' && override.picture) continue;
          const self = override.nodeId === node.id;
          if (self && field === 'width' && node.instance.sizing.horizontal !== 'FIXED') continue;
          if (self && field === 'height' && node.instance.sizing.vertical !== 'FIXED') continue;
          finding('overrides', field, `${field} overridden inside an instance of ${node.name}`, override.nodeId);
        }
      }
    }
    if (node.type !== 'TEXT' && DEFAULT_LAYER_NAME.test(node.name))
      finding('naming', undefined, `${node.name} keeps a default name`);
  }
  return findings;
}
