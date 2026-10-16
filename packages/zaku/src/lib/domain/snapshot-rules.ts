import type { NodeSnapshot } from '../schema/bridge.js';
import type { CopyConfig } from '../schema/zaku-config.js';
import { DEFAULT_COPY } from './copy-defaults.js';
import { ALLOWED_OVERRIDES, SIZING_MODES, componentSized, stretches } from './checks/overrides.js';
import { copyIssues, copyPolicy, type ResolvedCopy } from './copy-rules.js';
import { COVER } from './documentation-measures.js';
import { DOCUMENTATION_COMPONENT_NAMES, documentationFindings, holdsReferenceText } from './documentation-rule.js';
import type { Finding } from './findings.js';
import { isDefaultLayerName } from './layer-names.js';

/** A library page holding one entry opens with U+2756 and a space, as building-the-library's Figma reference names it. */
const ENTRY_PAGE_PREFIX = '\u2756 ';
/** The library pages that hold only documentation: the cover and the documentation components. */
const DOCUMENTATION_PAGES: ReadonlySet<string> = new Set(['Thumbnail', 'Component for Docs']);
/** A box edge this close to another is touching, not overlapping. */
const EDGE_TOLERANCE = 0.01;

/** The kinds a product component is filed under, as writing-a-design-component's table names them. */
const COMPONENT_KINDS = ['data-entry', 'navigation', 'feedback', 'data-display', 'layout', 'general'] as const;
/** A product file's page for one component, `<kind> / <Component>`, as writing-a-design-component's Figma reference names it. */
const KIND_PAGE = new RegExp(`^(${COMPONENT_KINDS.join('|')}) / .+$`);
/** The Section on a feature's page holding the components only that feature uses, with their views. */
const FEATURE_COMPONENTS_SECTION = '_components';

/**
 * Whether the node is documentation, whose measures and type the references write as numbers. In the library: anything
 * on the cover or documentation-component page, and anything on an entry page outside its components. In a product
 * file: anything on a kind's component page, or in a feature's `_components` Section, outside the components.
 */
function isDocumentation(node: NodeSnapshot): boolean {
  const page = node.page?.name;
  if (page === undefined) return false;
  if (DOCUMENTATION_PAGES.has(page)) return true;
  if (node.componentSource !== false) return false;
  return page.startsWith(ENTRY_PAGE_PREFIX) || KIND_PAGE.test(page) || node.frame === FEATURE_COMPONENTS_SECTION;
}

type Paints = NodeSnapshot['fills'];

/** Whether two layers paint with the same variables, in the same order. */
const sameColours = (a: Paints, b: Paints): boolean =>
  a.map((paint) => paint.variable ?? '').join() === b.map((paint) => paint.variable ?? '').join();

type Box = { x: number; y: number; width: number; height: number };

function overlaps(a: Box, b: Box): boolean {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return width > EDGE_TOLERANCE && height > EDGE_TOLERANCE;
}

/**
 * A frame that holds no layer and paints nothing, more than 1 px on both axes: the leftover of a frame made and never
 * filled, which keeps the size it was made at however it sizes, a new auto layout frame hugging included. A spacer is
 * 1 px across, as Nova's flex-1 and ml-auto are, so it passes.
 */
function isEmptyRoom(node: NodeSnapshot): boolean {
  const box = node.box;
  if (node.type !== 'FRAME' || !box || box.children !== 0) return false;
  if (node.fills.length > 0 || node.strokes.length > 0) return false;
  return box.width > 1 && box.height > 1;
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
 * The rules a `run_script` is held to, over what the script touched. `copy` is zaku.yaml's copy section; the
 * library copy the touched instances carry is allowed beside it, as zaku check allows it.
 */
export function snapshotFindings(
  nodes: readonly NodeSnapshot[],
  copy: CopyConfig | ResolvedCopy = DEFAULT_COPY,
): Finding[] {
  const policy = copyPolicy(
    copy,
    // A documentation component's texts are the reference's own, such as DS/List Item's bullet, not library copy.
    nodes.flatMap((node) =>
      node.main && DOCUMENTATION_COMPONENT_NAMES.has(node.main) ? [] : (node.instance?.carried ?? []),
    ),
  );
  const findings: Finding[] = [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  /** The layers an instance overrides; the overrides rule, not this one, judges a recolour. */
  const overridden = new Set(nodes.flatMap((node) => node.instance?.overrides.map((o) => o.nodeId) ?? []));
  /** Whether the node is the brand's mark, placed from its SVG inside the cover's Logo frame in the brand's colours. */
  const brandMark = (node: NodeSnapshot): boolean => {
    if (node.page?.name !== COVER.page) return false;
    for (let up = byId.get(node.parentId ?? ''); up; up = byId.get(up.parentId ?? ''))
      if (up.name === COVER.logo) return true;
    return false;
  };
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
    const mark = brandMark(node);
    if (!mark && node.fills.some((paint) => !paint.bound)) finding('binding', 'fill', `${label}: fill is a raw value`);
    if (!mark && node.strokes.some((paint) => !paint.bound))
      finding('binding', 'stroke', `${label}: stroke is a raw value`);
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
    if (node.characters !== undefined && !holdsReferenceText(node)) {
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
          // A component recolours a nested icon to its label by the glyph's paint, as Nova's Button does; the
          // binding rule still holds that paint to a variable, and a product frame never recolours an instance.
          if (!self && (field === 'fills' || field === 'strokes') && node.componentSource === true) continue;
          // An icon swap drops the colour the component gives its glyph; painting it back restyles nothing.
          const layer = byId.get(override.nodeId);
          if (!self && (field === 'fills' || field === 'strokes') && layer?.source)
            if (sameColours(layer[field], layer.source[field])) continue;
          // Documentation lays out its own components: a table sizes each column's head and cell to the column.
          if (self && (field === 'width' || field === 'height') && documentation) continue;
          // A component sizes an icon inside it to the size its code draws at, as Nova's Button sets its 16 px icon
          // to 12 at xs; a product frame sizes no instance.
          if (self && (field === 'width' || field === 'height') && node.componentSource === true) continue;
          if (self && field === 'width' && node.instance.sizing.horizontal !== 'FIXED') continue;
          if (self && field === 'height' && node.instance.sizing.vertical !== 'FIXED') continue;
          if (self && SIZING_MODES.has(field) && stretches(node.instance.sizing)) continue;
          if (self && componentSized(field, node.box, node.instance.main)) continue;
          finding('overrides', field, `${field} overridden inside an instance of ${node.name}`, override.nodeId);
        }
      }
    }
    if (isEmptyRoom(node))
      finding(
        'empty',
        undefined,
        `${node.name}: an empty frame ${Math.round(node.box?.width ?? 0)}x${Math.round(node.box?.height ?? 0)} that shows nothing; it holds no layer, so remove it or put in what it was made for`,
      );
    if (isDefaultLayerName(node.type, node.name)) finding('naming', undefined, `${node.name} keeps a default name`);
    if (node.source) {
      const off = (['fills', 'strokes'] as const).filter(
        (field) => !sameColours(node[field], node.source?.[field] ?? []),
      );
      if (off.length > 0 && !overridden.has(node.id))
        finding(
          'binding',
          off[0] === 'fills' ? 'fill' : 'stroke',
          `${label}: paints with another colour than the same layer in its component (${(node.source[off[0] ?? 'fills'] ?? []).map((paint) => paint.variable ?? 'raw').join(', ')}), which an icon swap dropped`,
        );
    }
  }
  const frames = new Map(nodes.map((node) => [node.id, node.frame]));
  for (const { nodeId, field, message } of documentationFindings(nodes)) {
    const frame = frames.get(nodeId);
    findings.push({ check: 'documentation', nodeId, field, ...(frame ? { frame } : {}), message });
  }
  return findings;
}
