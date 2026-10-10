import type { NodeSnapshot } from '../schema/bridge.js';
import {
  COVER,
  DOCUMENTATION_COMPONENTS_PAGE,
  DOCUMENTATION_PARTS,
  type DocumentationLayout,
  type DocumentationPart,
} from './documentation-measures.js';

/** A library page holding one entry opens with U+2756 and a space. */
const ENTRY_PAGE_PREFIX = '\u2756 ';
/** A view's frame is named `<Style> / <Component>`, or that and ` / Guidance`. */
const VIEW_NAME = / \/ /;
/** A size this close to the measure is the measure. */
const TOLERANCE = 0.5;

export interface DocumentationFinding {
  nodeId: string;
  field: string;
  message: string;
}

type Located = { node: NodeSnapshot; path: string[]; where: DocumentationPart['where'] };

/**
 * Where the node sits in the documentation: its names from the documentation component, or from its view's frame,
 * down to it. Null off the documentation, or where the snapshot does not hold every node between.
 */
function locate(node: NodeSnapshot, byId: ReadonlyMap<string, NodeSnapshot>): Located | null {
  const page = node.page;
  if (!page) return null;
  const where =
    page.name === DOCUMENTATION_COMPONENTS_PAGE
      ? 'components'
      : page.name.startsWith(ENTRY_PAGE_PREFIX)
        ? 'view'
        : null;
  if (where === null) return null;
  const path: string[] = [];
  for (let up: NodeSnapshot | undefined = node; up; up = up.parentId ? byId.get(up.parentId) : undefined) {
    path.unshift(up.name);
    if (up.parentId === page.id) {
      if (where === 'view' && (up.type !== 'FRAME' || !VIEW_NAME.test(up.name))) return null;
      return { node, path, where };
    }
  }
  return null;
}

const literal = (part: DocumentationPart): number => part.path.filter((name) => name !== '*').length;

/** The most particular part the node is, if any: a name beats `*`, and `main` under `*` picks among instances. */
function partOf(located: Located): DocumentationPart | null {
  const candidates = DOCUMENTATION_PARTS.filter((part) => {
    if (part.where !== located.where || part.path.length !== located.path.length) return false;
    if (!part.path.every((name, index) => name === '*' || name === located.path[index])) return false;
    const picks = part.main !== undefined && part.path.at(-1) === '*';
    return !picks || located.node.main === part.main;
  });
  return candidates.sort((a, b) => literal(b) - literal(a))[0] ?? null;
}

const weightOf = (style: string): string => style.replace(/\s+/g, '').toLowerCase();
const near = (a: number, b: number): boolean => Math.abs(a - b) <= TOLERANCE;
const padded = (padding: readonly number[]): string => padding.join(' ');

/** What differs between the node's auto layout and one the documentation allows, or nothing. */
function layoutDifferences(box: NonNullable<NodeSnapshot['box']>, layout: DocumentationLayout): string[] {
  const differences: string[] = [];
  if (box.layout !== layout.mode) differences.push(`layout ${box.layout}, not ${layout.mode}`);
  if (!box.padding.every((side, index) => near(side, layout.padding[index] ?? 0)))
    differences.push(`padding ${padded(box.padding)}, not ${padded(layout.padding)}`);
  if (!near(box.gap, layout.gap)) differences.push(`gap ${box.gap}, not ${layout.gap}`);
  if (layout.crossGap !== undefined && !near(box.crossGap, layout.crossGap))
    differences.push(`row gap ${box.crossGap}, not ${layout.crossGap}`);
  if (layout.wrap !== undefined && box.wrap !== layout.wrap)
    differences.push(layout.wrap ? 'does not wrap, and it wraps' : 'wraps, and it does not');
  if (layout.align && (box.align[0] !== layout.align[0] || box.align[1] !== layout.align[1]))
    differences.push(`aligns ${box.align.join(' ')}, not ${layout.align.join(' ')}`);
  return differences;
}

function partFindings(node: NodeSnapshot, part: DocumentationPart, label: string): DocumentationFinding[] {
  const findings: DocumentationFinding[] = [];
  const add = (field: string, message: string): void => {
    findings.push({ nodeId: node.id, field, message: `${label}: ${message}` });
  };
  if (node.type !== part.type) add('type', `is a ${node.type}, and the documentation draws a ${part.type}`);
  if (part.main !== undefined && part.path.at(-1) !== '*' && node.main !== undefined && node.main !== part.main)
    add('main', `is an instance of ${node.main ?? 'no component'}, not of ${part.main}`);
  const box = node.box;
  if (box) {
    if (part.at && (!near(box.x, part.at.x) || !near(box.y, part.at.y)))
      add('at', `sits at ${box.x}, ${box.y}, not ${part.at.x}, ${part.at.y}`);
    if (part.width !== undefined && !near(box.width, part.width))
      add('width', `is ${box.width} wide, not ${part.width}`);
    if (part.height !== undefined && !near(box.height, part.height))
      add('height', `is ${box.height} high, not ${part.height}`);
    for (const axis of ['horizontal', 'vertical'] as const) {
      const sizing = part.sizing?.[axis];
      if (sizing !== undefined && box.sizing[axis] !== sizing)
        add(`sizing.${axis}`, `sizes ${box.sizing[axis]} ${axis}ly, not ${sizing}`);
    }
    if (part.layout) {
      const allowed = Array.isArray(part.layout) ? part.layout : [part.layout as DocumentationLayout];
      const differences = allowed.map((layout) => layoutDifferences(box, layout));
      if (differences.every((list) => list.length > 0)) add('layout', (differences[0] ?? []).join('; '));
    }
  }
  if (part.font && node.font) {
    const { size, lineHeight, style } = node.font;
    if (size !== part.font.size || lineHeight !== part.font.lineHeight)
      add('font', `is set ${size} / ${lineHeight}, not ${part.font.size} / ${part.font.lineHeight}`);
    if (weightOf(style) !== weightOf(part.font.weight)) add('weight', `is ${style}, not ${part.font.weight}`);
  }
  if (part.text !== undefined && node.characters !== undefined && node.characters !== part.text)
    add('text', `reads "${node.characters}", not "${part.text}"`);
  if (part.properties && node.properties) {
    const have = node.properties.map((p) => `${p.name} ${p.type} ${String(p.default)}`).sort();
    const want = part.properties.map((p) => `${p.name} ${p.type} ${String(p.default)}`).sort();
    if (have.join('|') !== want.join('|'))
      add('properties', `has the properties [${have.join(', ')}], not [${want.join(', ')}]`);
  }
  return findings;
}

/**
 * The documentation rule: every documentation component on its page, and every view's header, body, sections,
 * headings, previews, tables and lists, against the documentation's measures. Colours are the binding rule's.
 */
export function documentationFindings(nodes: readonly NodeSnapshot[]): DocumentationFinding[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const findings: DocumentationFinding[] = [];
  const located = nodes.map((node) => locate(node, byId)).filter((at): at is Located => at !== null);
  const roots = new Map<string, NodeSnapshot[]>();
  for (const at of located) {
    const part = partOf(at);
    const label = at.path.join(' / ');
    if (at.where === 'components' && at.path.length === 1) {
      roots.set(at.node.name, [...(roots.get(at.node.name) ?? []), at.node]);
      if (!part && (at.node.type === 'COMPONENT' || at.node.type === 'COMPONENT_SET'))
        findings.push({
          nodeId: at.node.id,
          field: 'name',
          message: `${label}: is not one of the documentation components`,
        });
    }
    if (part) findings.push(...partFindings(at.node, part, label));
  }
  for (const [name, same] of roots) {
    for (const extra of same.slice(1))
      findings.push({ nodeId: extra.id, field: 'name', message: `${name}: a second component of that name` });
  }
  // A component whose layers the snapshot holds holds every layer the documentation names.
  for (const at of located) {
    if (at.where !== 'components' || at.path.length !== 1) continue;
    const children = nodes.filter((node) => node.parentId === at.node.id);
    if (children.length === 0) continue;
    for (const part of DOCUMENTATION_PARTS) {
      if (part.where !== 'components' || part.path[0] !== at.node.name || part.path.length < 2) continue;
      const present = located.some(
        (other) => other.path.length === part.path.length && other.path.every((name, i) => name === part.path[i]),
      );
      if (!present)
        findings.push({
          nodeId: at.node.id,
          field: 'layers',
          message: `${at.node.name}: holds no ${part.path.slice(1).join(' / ')}`,
        });
    }
  }
  findings.push(...coverFindings(nodes, byId));
  return findings;
}

/** Where a layer of the cover stands: its box on the cover, and the names from the cover down. */
interface CoverLayer {
  node: NodeSnapshot;
  x: number;
  y: number;
  right: number;
  bottom: number;
  path: string[];
  /** An instance, or a layer with nothing under it in the snapshot: judged by its own box. */
  block: boolean;
  /** The cover layers above it, nearest first. */
  above: CoverLayer[];
}

/**
 * Every layer of the cover that its frame cuts off. The glow runs off every edge. At the right edge a layer bleeds
 * when its column, the blocks that start where it starts, runs a quarter of a block's width past the edge, as the
 * measured cover's second column does; a block that crosses the edge by less, or ends inside the right margin, is
 * a mistake, and a frame may reach past the edge only as far as a bleeding layer in it. A layer whose layers above
 * it the snapshot lacks, or that sits inside an instance, is left to the instance.
 */
function coverFindings(
  nodes: readonly NodeSnapshot[],
  byId: ReadonlyMap<string, NodeSnapshot>,
): DocumentationFinding[] {
  const layers = new Map<string, CoverLayer>();
  const place = (node: NodeSnapshot): CoverLayer | null => {
    const known = layers.get(node.id);
    if (known) return known;
    const parent = byId.get(node.parentId ?? '');
    if (!node.box || !parent || parent.type === 'INSTANCE') return null;
    let x = node.box.x;
    let y = node.box.y;
    let path: string[];
    let above: CoverLayer[] = [];
    if (parent.parentId === node.page?.id) {
      if (parent.name !== COVER.frame || node.name === COVER.bleeds) return null;
      path = [parent.name, node.name];
    } else {
      const up = place(parent);
      if (!up) return null;
      x += up.x;
      y += up.y;
      path = [...up.path, node.name];
      above = [up, ...up.above];
    }
    const block = node.type === 'INSTANCE' || !nodes.some((other) => other.parentId === node.id);
    const layer = { node, x, y, right: x + node.box.width, bottom: y + node.box.height, path, block, above };
    layers.set(node.id, layer);
    return layer;
  };
  for (const node of nodes) if (node.page?.name === COVER.page) place(node);
  const all = [...layers.values()];
  const blocks = all.filter((layer) => layer.block);
  const past = (right: number): number => right - COVER.width;
  /** Whether the blocks that start at the block's left edge run a quarter of one's width past the right edge. */
  const columnBleeds = (layer: CoverLayer): boolean =>
    blocks.some(
      (other) =>
        Math.abs(other.x - layer.x) <= TOLERANCE &&
        past(other.right) > TOLERANCE &&
        past(other.right) >= COVER.bleed * (other.node.box?.width ?? 0),
    );
  const findings: DocumentationFinding[] = [];
  const add = (layer: CoverLayer, field: string, message: string): void => {
    findings.push({ nodeId: layer.node.id, field, message: `${layer.path.join(' / ')}: ${message}` });
  };
  const cut = (layer: CoverLayer): string[] =>
    (
      [
        ['left', -layer.x],
        ['top', -layer.y],
        ['bottom', layer.bottom - COVER.height],
      ] as const
    )
      .filter(([, by]) => by > TOLERANCE)
      .map(([edge, by]) => `reaches ${Math.round(by)} past the cover's ${edge} edge`);
  for (const layer of all) {
    const reaches = cut(layer);
    if (reaches.length > 0 && !layer.above.some((up) => cut(up).length > 0))
      add(layer, 'bounds', `${reaches.join(', ')}, which cuts it off`);
    const over = past(layer.right);
    if (layer.block) {
      if (columnBleeds(layer)) continue;
      const width = Math.round(layer.node.box?.width ?? 0);
      if (over > TOLERANCE)
        add(
          layer,
          'bounds',
          `crosses the cover's right edge by ${Math.round(over)} of its ${width}; bleed a quarter of its width past it, or end it ${COVER.margin} inside`,
        );
      else if (past(layer.right + COVER.margin) > TOLERANCE)
        add(
          layer,
          'bounds',
          `ends ${Math.round(-over)} inside the cover's right edge, within its ${COVER.margin} margin`,
        );
      continue;
    }
    if (over <= TOLERANCE) continue;
    const inside = all.filter((other) => other.above.includes(layer));
    const bleeding = inside.filter((other) => other.block && past(other.right) > TOLERANCE && columnBleeds(other));
    const reach = Math.max(COVER.width, ...bleeding.map((other) => other.right));
    if (layer.right <= reach + TOLERANCE) continue;
    // A frame hugging a layer that crosses the edge is reported through that layer.
    if (inside.some((other) => Math.abs(other.right - layer.right) <= TOLERANCE)) continue;
    add(
      layer,
      'bounds',
      bleeding.length > 0
        ? `reaches ${Math.round(layer.right - reach)} past the layers that bleed from it at the cover's right edge`
        : `reaches ${Math.round(over)} past the cover's right edge, and nothing in it bleeds`,
    );
  }
  return findings;
}

/** The names of the documentation components, whose own texts are the reference's and not the library's copy. */
export const DOCUMENTATION_COMPONENT_NAMES: ReadonlySet<string> = new Set(
  DOCUMENTATION_PARTS.filter((part) => part.where === 'components' && part.path.length === 1).map(
    (part) => part.path[0] ?? '',
  ),
);

/**
 * Whether the node is a documentation component's text layer showing exactly the text the measures give it, such
 * as DS/List Item's `Bullet` reading U+2022: the reference requires that text there, whatever the copy rules say.
 */
export function holdsReferenceText(node: NodeSnapshot): boolean {
  if (node.type !== 'TEXT' || node.characters === undefined) return false;
  if (node.page?.name !== DOCUMENTATION_COMPONENTS_PAGE) return false;
  return DOCUMENTATION_PARTS.some(
    (part) =>
      part.where === 'components' &&
      part.type === 'TEXT' &&
      part.text === node.characters &&
      part.path[0] === node.frame &&
      part.path.at(-1) === node.name,
  );
}
