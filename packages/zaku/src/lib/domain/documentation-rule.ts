import type { NodeSnapshot } from '../schema/bridge.js';
import {
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
  return findings;
}
