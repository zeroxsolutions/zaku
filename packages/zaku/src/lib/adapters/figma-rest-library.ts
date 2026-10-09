import type { FigmaRest } from './figma-rest.js';
import type { RestAlias, RestNode, RestNodeEntry, RestPaint } from './figma-rest-types.js';
import type { LibraryComponent, LibraryItem, LibrarySnapshot, Rgba, VariablePart } from '../domain/library.js';

/** Component names starting with one of these are documentation, not library. */
export const DOCUMENTATION_PREFIXES = ['DS/'];

const round = (value: number): number => Math.round(value * 10000) / 10000;

export function hexToRgba(hex: string): Rgba | null {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i.exec(hex);
  if (!match) return null;
  const channel = (text: string | undefined): number => round(parseInt(text ?? 'ff', 16) / 255);
  return { r: channel(match[1]), g: channel(match[2]), b: channel(match[3]), a: channel(match[4]) };
}

/** `Variant=default, Size=sm` to its properties. */
export function variantProps(name: string): Record<string, string> {
  return Object.fromEntries(
    name
      .split(',')
      .map((pair) => pair.split('=').map((side) => side.trim()))
      .filter((pair): pair is [string, string] => pair.length === 2 && pair[0] !== '' && pair[1] !== ''),
  );
}

/** The `code:`, `props:` and `parts:` lines of a component's description, which are its map to the code. */
export function descriptionMap(text: string): Pick<LibraryComponent, 'codePath' | 'map'> {
  const lines: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const [, key, value] = /^(code|props|parts):\s*(.+)$/.exec(line.trim()) ?? [];
    if (key && value) lines[key] = value.trim();
  }
  const map =
    lines['props'] || lines['parts']
      ? { props: variantProps(lines['props'] ?? ''), parts: variantProps(lines['parts'] ?? '') }
      : null;
  return { codePath: lines['code'] ?? null, map };
}

interface Resolve {
  values: VariablePart['tokens'][number]['values'];
  variables: VariablePart['variables'];
  entry: RestNodeEntry;
}

function variableName(id: string, variables: VariablePart['variables']): string {
  return variables[id] ?? variables[id.replace(/^VariableID:/, '')] ?? id;
}

function aliasId(value: unknown): string | undefined {
  const alias = Array.isArray(value) ? value[0] : value;
  return alias && typeof alias === 'object' && 'id' in alias && typeof alias.id === 'string' ? alias.id : undefined;
}

function paintOf(paints: RestPaint[] | undefined, at: Resolve): { value: Rgba | null; binding: string | null } {
  const solid = (paints ?? []).find((paint) => paint.visible !== false && paint.type === 'SOLID');
  if (!solid) return { value: null, binding: null };
  const id = solid.boundVariables?.color?.id;
  if (id) {
    const name = variableName(id, at.variables);
    const value = at.values[name];
    // A bound paint's opacity is the variable's own alpha, which the token value already carries.
    return { value: typeof value === 'string' ? hexToRgba(value) : null, binding: name };
  }
  const color = solid.color ?? { r: 0, g: 0, b: 0 };
  return {
    value: {
      r: round(color.r),
      g: round(color.g),
      b: round(color.b),
      a: round((color.a ?? 1) * (solid.opacity ?? 1)),
    },
    binding: null,
  };
}

/** Figma REST files a corner radius binding under `rectangleCornerRadii`, one key per corner. */
const CORNERS = ['TOP_LEFT', 'TOP_RIGHT', 'BOTTOM_LEFT', 'BOTTOM_RIGHT'].map(
  (corner) => `RECTANGLE_${corner}_CORNER_RADIUS`,
);

function cornerAliases(node: RestNode): (string | undefined)[] {
  const radii = node.boundVariables?.['rectangleCornerRadii'];
  const byCorner =
    radii && !Array.isArray(radii) && !('id' in radii) ? (radii as Record<string, RestAlias | undefined>) : {};
  return CORNERS.map((corner) => aliasId(byCorner[corner]));
}

/** A bound radius is one token for all four corners; otherwise each corner as drawn, clockwise from top left. */
function radiiOf(node: RestNode, token: unknown): [number, number, number, number] {
  if (typeof token === 'number') return [token, token, token, token];
  if (node.rectangleCornerRadii) return node.rectangleCornerRadii;
  const radius = node.cornerRadius ?? 0;
  return [radius, radius, radius, radius];
}

function strokeWeightsOf(node: RestNode): [number, number, number, number] {
  const sides = node.individualStrokeWeights;
  if (sides) return [sides.top, sides.right, sides.bottom, sides.left];
  const weight = node.strokeWeight ?? 0;
  return [weight, weight, weight, weight];
}

function itemsOf(root: RestNode, at: Resolve): LibraryItem[] {
  const out: LibraryItem[] = [];
  const visit = (node: RestNode, path: string): void => {
    if (node.visible === false) return;
    const isText = node.type === 'TEXT';
    const fill = paintOf(node.fills, at);
    const stroke = paintOf(node.strokes, at);
    const corners = cornerAliases(node);
    // A radius is bound only when every corner is bound to one variable; a corner left raw is a raw radius.
    const radiusId = corners[0] && corners.every((id) => id === corners[0]) ? corners[0] : null;
    const radiusName = radiusId ? variableName(radiusId, at.variables) : null;
    const radiusToken = radiusName ? at.values[radiusName] : undefined;
    const auto = node.layoutMode !== undefined && node.layoutMode !== 'NONE';
    const box = node.absoluteBoundingBox;
    const textStyle = node.styles?.['text'];
    const componentId = node.type === 'INSTANCE' ? node.componentId : path === '' ? node.id : undefined;
    out.push({
      nodeId: node.id,
      path,
      type: node.type,
      fill: isText ? null : fill.value,
      stroke: stroke.value,
      textColor: isText ? fill.value : null,
      width: box?.width ?? 0,
      height: box?.height ?? 0,
      padding: auto
        ? [node.paddingTop ?? 0, node.paddingRight ?? 0, node.paddingBottom ?? 0, node.paddingLeft ?? 0]
        : null,
      gap: auto ? (node.itemSpacing ?? 0) : null,
      radii: isText ? null : radiiOf(node, radiusToken),
      strokeWeights: stroke.value === null ? null : strokeWeightsOf(node),
      fontSize: isText ? (node.style?.fontSize ?? null) : null,
      fontFamily: isText ? (node.style?.fontFamily ?? null) : null,
      textStyleKey: textStyle ? (at.entry.styles[textStyle]?.key ?? null) : null,
      componentKey: componentId ? (at.entry.components[componentId]?.key ?? null) : null,
      bindings: {
        fill: isText ? null : fill.binding,
        stroke: stroke.binding,
        textColor: isText ? fill.binding : null,
        radius: radiusName,
      },
    });
    if (path === '' || node.type !== 'INSTANCE') {
      for (const child of node.children ?? []) visit(child, path === '' ? child.name : `${path}/${child.name}`);
    }
  };
  visit(root, '');
  return out;
}

/**
 * Reads every published component over REST and resolves each item in each mode combination from the
 * variables the Plugin API exported, so the MCP is spent on variables alone.
 */
export async function readLibrary(options: {
  rest: FigmaRest;
  fileKey: string;
  part: VariablePart;
}): Promise<LibrarySnapshot> {
  const { rest, fileKey, part } = options;
  const listed = await rest.published(fileKey);
  const published = [
    ...listed.sets,
    ...listed.components.filter((component) => !component.containing_frame?.containingComponentSet),
  ].filter((meta) => !DOCUMENTATION_PREFIXES.some((prefix) => meta.name.startsWith(prefix)));
  const file = await rest.file(fileKey, 1);
  const response =
    published.length > 0
      ? await rest.nodes(
          fileKey,
          published.map((meta) => meta.node_id),
        )
      : { version: file.version, nodes: {} };
  const components: LibraryComponent[] = [];
  for (const meta of published) {
    const entry = response.nodes[meta.node_id];
    if (!entry) continue;
    const variantNodes =
      entry.document.type === 'COMPONENT_SET'
        ? (entry.document.children ?? []).filter((child) => child.type === 'COMPONENT')
        : [entry.document];
    components.push({
      name: meta.name,
      key: meta.key,
      page: (meta.containing_frame?.pageName ?? '').replace(/^\W+\s*/, ''),
      ...descriptionMap(meta.description),
      variants: variantNodes.map((variant) => ({
        key: entry.components[variant.id]?.key ?? '',
        name: variant.name,
        props: entry.document.type === 'COMPONENT_SET' ? variantProps(variant.name) : {},
        modes: part.tokens.map((token) => ({
          combo: token.combo,
          items: itemsOf(variant, { values: token.values, variables: part.variables, entry }),
        })),
      })),
    });
  }
  return {
    source: fileKey,
    version: file.version,
    exportedAt: part.exportedAt,
    components,
    textStyles: part.textStyles,
    tokens: part.tokens.map((token) => ({
      combo: token.combo,
      values: Object.fromEntries(
        Object.entries(token.values).map(([name, value]) => [
          name,
          typeof value === 'string' ? (hexToRgba(value) ?? value) : value,
        ]),
      ),
    })),
  };
}
