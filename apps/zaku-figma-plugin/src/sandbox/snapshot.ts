import type { NodeSnapshot } from '@zeroxsolutions/zaku/schema';

type Paint = { type: string; visible?: boolean; opacity?: number; boundVariables?: { color?: { id?: unknown } } };
const SPACING = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'itemSpacing'] as const;

function paints(value: unknown): NodeSnapshot['fills'] {
  if (!Array.isArray(value)) return [];
  return (value as Paint[])
    .filter((paint) => paint.type === 'SOLID' && paint.visible !== false && (paint.opacity ?? 1) > 0)
    .map((paint) => {
      const variable = paint.boundVariables?.color?.id;
      return { bound: Boolean(paint.boundVariables?.color), ...(typeof variable === 'string' ? { variable } : {}) };
    });
}

/** The layer an override names: the instance itself, or one inside it. */
function layerOf(instance: SceneNode, id: string): unknown {
  if (instance.id === id) return instance;
  const findOne = (instance as unknown as Record<string, unknown>)['findOne'] as
    | ((match: (n: { id: string }) => boolean) => unknown)
    | undefined;
  return findOne ? findOne.call(instance, (n) => n.id === id) : null;
}

type Ancestor = { id: string; name: string; type: string; parent?: Ancestor | null };

/** What a node's ancestors decide about it, read once per node and handed down to its children. */
type Ancestry = {
  /** The top-level frame on the page that holds the node, the node itself when it is one; null off a page. */
  frame: string | null;
  page: { id: string; name: string } | null;
  /** Whether the node is a component or a component set, or sits inside one. */
  componentSource: boolean;
  /** Whether an instance holds the node, whose text is then the instance's to report. */
  insideInstance: boolean;
};

/** Ancestries by node id, so a snapshot of a large set walks each parent chain once. */
export type AncestryCache = Map<string, Ancestry>;

function ancestryOf(node: Ancestor, cache: AncestryCache): Ancestry {
  const known = cache.get(node.id);
  if (known) return known;
  const parent = node.parent ?? null;
  const above = parent ? ancestryOf(parent, cache) : null;
  const ancestry: Ancestry = {
    frame: parent?.type === 'PAGE' ? node.name : (above?.frame ?? null),
    page: node.type === 'PAGE' ? { id: node.id, name: node.name } : (above?.page ?? null),
    componentSource: node.type === 'COMPONENT' || node.type === 'COMPONENT_SET' || (above?.componentSource ?? false),
    insideInstance: parent?.type === 'INSTANCE' || (above?.insideInstance ?? false),
  };
  cache.set(node.id, ancestry);
  return ancestry;
}

/** The layer types a glyph is drawn with. */
const GLYPH_TYPES: ReadonlySet<string> = new Set([
  'VECTOR',
  'BOOLEAN_OPERATION',
  'ELLIPSE',
  'RECTANGLE',
  'LINE',
  'STAR',
  'POLYGON',
]);

/**
 * The id of the same layer in the outermost instance's component. Figma names a layer inside an instance
 * `I<instance>;<layer>`, a layer nested deeper `I<instance>;<nested instance>;<layer>`; null for any other id.
 */
export function sourceLayerId(id: string): string | null {
  if (!id.startsWith('I')) return null;
  const path = id.slice(1).split(';').slice(1);
  if (path.length === 0) return null;
  return path.length === 1 ? (path[0] ?? null) : `I${path.join(';')}`;
}

type Box = { id: string; name: string; x: number; y: number; width: number; height: number };

/** A component set's size and its variants' boxes, which the set clips. */
function setLayout(node: Record<string, unknown>): NonNullable<NodeSnapshot['set']> {
  const children = (node['children'] as Box[] | undefined) ?? [];
  return {
    width: Number(node['width'] ?? 0),
    height: Number(node['height'] ?? 0),
    variants: children.map(({ id, name, x, y, width, height }) => ({ id, name, x, y, width, height })),
  };
}

/** The characters of every text layer in an instance that no override changed: the component's own copy. */
function carriedTexts(instance: SceneNode, overridden: ReadonlySet<string>): string[] {
  const findAll = (instance as unknown as Record<string, unknown>)['findAll'] as
    | ((match: (n: { id: string; type: string }) => boolean) => { id: string; characters?: unknown }[])
    | undefined;
  if (!findAll) return [];
  return findAll
    .call(instance, (n) => n.type === 'TEXT' && !overridden.has(n.id))
    .map((n) => (typeof n.characters === 'string' ? n.characters : ''));
}

function holdsPicture(layer: unknown): boolean {
  const fills = (layer as { fills?: unknown } | null)?.fills;
  return Array.isArray(fills) && fills.some((paint: { type?: string }) => paint.type === 'IMAGE');
}

/** The node types that have a box the documentation rule reads. */
const BOXED = new Set(['FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE', 'TEXT']);

const number = (value: unknown): number => (typeof value === 'number' ? value : 0);

/** Its place in its parent, its size and sizing, and its auto layout. */
function boxOf(any: Record<string, unknown>): NonNullable<NodeSnapshot['box']> {
  const layout = typeof any['layoutMode'] === 'string' ? (any['layoutMode'] as string) : 'NONE';
  const grid = layout === 'GRID';
  return {
    x: number(any['x']),
    y: number(any['y']),
    width: number(any['width']),
    height: number(any['height']),
    sizing: {
      horizontal: String(any['layoutSizingHorizontal'] ?? 'FIXED'),
      vertical: String(any['layoutSizingVertical'] ?? 'FIXED'),
    },
    layout,
    wrap: any['layoutWrap'] === 'WRAP',
    padding: [
      number(any['paddingTop']),
      number(any['paddingRight']),
      number(any['paddingBottom']),
      number(any['paddingLeft']),
    ],
    gap: grid ? number(any['gridColumnGap']) : number(any['itemSpacing']),
    crossGap: grid ? number(any['gridRowGap']) : number(any['counterAxisSpacing']),
    align: [String(any['primaryAxisAlignItems'] ?? 'MIN'), String(any['counterAxisAlignItems'] ?? 'MIN')],
    children: Array.isArray(any['children']) ? (any['children'] as unknown[]).length : 0,
  };
}

/** A text's size, its line height in px, and its font's style name; `mixed` across ranges. */
function fontOf(any: Record<string, unknown>, mixed: symbol): NonNullable<NodeSnapshot['font']> {
  const size = any['fontSize'];
  const line = any['lineHeight'] as { unit?: string; value?: number } | symbol | undefined;
  const name = any['fontName'] as { style?: string } | symbol | undefined;
  const px = typeof size === 'number' ? size : 0;
  return {
    size: size === mixed ? 'mixed' : px,
    lineHeight:
      line === mixed || typeof line !== 'object'
        ? 'mixed'
        : line.unit === 'AUTO'
          ? 'auto'
          : line.unit === 'PERCENT'
            ? (px * number(line.value)) / 100
            : number(line.value),
    style: name === mixed || typeof name !== 'object' ? 'mixed' : String(name.style ?? ''),
  };
}

/** A component's or a set's properties, by the name a designer reads; a variant keeps none of its own. */
function propertiesOf(
  node: Record<string, unknown> & { type: string; parent?: Ancestor | null },
): NodeSnapshot['properties'] {
  if (node.type !== 'COMPONENT_SET' && (node.type !== 'COMPONENT' || node.parent?.type === 'COMPONENT_SET'))
    return undefined;
  const definitions = node['componentPropertyDefinitions'] as
    | Record<string, { type: string; defaultValue: string | boolean }>
    | undefined;
  if (!definitions) return undefined;
  return Object.entries(definitions).map(([key, { type, defaultValue }]) => ({
    name: key.split('#')[0] ?? key,
    type,
    default: defaultValue,
  }));
}

type MainComponent = {
  name: string;
  width?: unknown;
  height?: unknown;
  parent?: { type: string; name: string } | null;
};

/** An instance's component, read once for the name and the size the snapshot takes from it. */
async function mainComponentOf(node: Record<string, unknown>): Promise<MainComponent | null> {
  const get = node['getMainComponentAsync'] as (() => Promise<MainComponent | null>) | undefined;
  return get ? await get.call(node) : null;
}

/** The name of an instance's component: the set's, for a variant; null when it has none. */
function mainName(main: MainComponent | null): string | null {
  if (!main) return null;
  return main.parent?.type === 'COMPONENT_SET' ? main.parent.name : main.name;
}

/**
 * The size of an instance's component, kept only where Figma lists the instance's own width or height as
 * overridden, which it does after any resize, even one back to the component's size.
 */
function mainSize(
  id: string,
  main: MainComponent | null,
  overrides: readonly { id: string; overriddenFields: string[] }[],
): { width: number; height: number } | null {
  const own = overrides.find((o) => o.id === id);
  if (!own?.overriddenFields.some((field) => field === 'width' || field === 'height')) return null;
  return typeof main?.width === 'number' && typeof main.height === 'number'
    ? { width: main.width, height: main.height }
    : null;
}

/**
 * What the rules read of one node. `mixed` is `figma.mixed`, passed in so a spec can stand one in; a snapshot of
 * many nodes hands every call one `cache`.
 */
export async function snapshotNode(
  node: SceneNode,
  created: boolean,
  mixed: symbol = typeof figma === 'undefined' ? Symbol('mixed') : figma.mixed,
  cache: AncestryCache = new Map(),
  find: (id: string) => Promise<unknown> = (id) => figma.getNodeByIdAsync(id),
): Promise<NodeSnapshot> {
  const any = node as unknown as Record<string, unknown> & {
    parent?: Ancestor | null;
    boundVariables?: Record<string, unknown>;
  };
  const style = any['textStyleId'];
  const overrides = (any['overrides'] as { id: string; overriddenFields: string[] }[] | undefined) ?? [];
  const texted = new Set(overrides.filter((o) => o.overriddenFields.includes('characters')).map((o) => o.id));
  const carried = node.type === 'INSTANCE' ? carriedTexts(node, texted) : [];
  const auto = typeof any['layoutMode'] === 'string' && any['layoutMode'] !== 'NONE';
  const ancestry = ancestryOf(node as unknown as Ancestor, cache);
  const sourceId =
    GLYPH_TYPES.has(node.type) && ancestry.insideInstance && !ancestry.componentSource ? sourceLayerId(node.id) : null;
  const source = sourceId ? ((await find(sourceId)) as Record<string, unknown> | null) : null;
  const component = node.type === 'INSTANCE' ? await mainComponentOf(any) : null;
  const main = node.type === 'INSTANCE' ? mainSize(node.id, component, overrides) : null;
  const properties = propertiesOf(any as Record<string, unknown> & { type: string; parent?: Ancestor | null });
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    parentId: any.parent?.id ?? null,
    frame: ancestry.frame,
    created,
    fills: paints(any['fills']),
    strokes: paints(any['strokes']),
    textStyleId:
      node.type !== 'TEXT' ? null : style === mixed ? 'mixed' : typeof style === 'string' && style ? style : null,
    ...(node.type === 'TEXT' && !ancestry.insideInstance ? { characters: String(any['characters'] ?? '') } : {}),
    instance:
      node.type === 'INSTANCE'
        ? {
            overrides: overrides.map((o) => ({
              nodeId: o.id,
              fields: o.overriddenFields,
              ...(o.overriddenFields.includes('fills') && holdsPicture(layerOf(node, o.id)) ? { picture: true } : {}),
              ...(texted.has(o.id)
                ? { characters: String((layerOf(node, o.id) as { characters?: unknown } | null)?.characters ?? '') }
                : {}),
            })),
            ...(carried.length > 0 ? { carried } : {}),
            sizing: {
              horizontal: String(any['layoutSizingHorizontal'] ?? 'FIXED'),
              vertical: String(any['layoutSizingVertical'] ?? 'FIXED'),
            },
            ...(main ? { main } : {}),
          }
        : null,
    spacing: auto
      ? SPACING.map((field) => ({ field, value: Number(any[field] ?? 0), bound: Boolean(any.boundVariables?.[field]) }))
      : [],
    ...(source ? { source: { fills: paints(source['fills']), strokes: paints(source['strokes']) } } : {}),
    page: ancestry.page,
    componentSource: ancestry.componentSource,
    ...(BOXED.has(node.type) ? { box: boxOf(any) } : {}),
    ...(node.type === 'TEXT' ? { font: fontOf(any, mixed) } : {}),
    ...(properties ? { properties } : {}),
    ...(node.type === 'INSTANCE' ? { main: mainName(component) } : {}),
    ...(node.type === 'COMPONENT_SET' ? { set: setLayout(any) } : {}),
  };
}
