import type { NodeSnapshot } from '@zeroxsolutions/zaku/schema';

type Paint = { type: string; visible?: boolean; opacity?: number; boundVariables?: { color?: unknown } };
const SPACING = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'itemSpacing'] as const;

function paints(value: unknown): NodeSnapshot['fills'] {
  if (!Array.isArray(value)) return [];
  return (value as Paint[])
    .filter((paint) => paint.type === 'SOLID' && paint.visible !== false && (paint.opacity ?? 1) > 0)
    .map((paint) => ({ bound: Boolean(paint.boundVariables?.color) }));
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

/** The top-level frame on the page that holds the node, the node itself when it is one; null off a page. */
function frameOf(node: Ancestor): string | null {
  let top = node;
  while (top.parent && top.parent.type !== 'PAGE') top = top.parent;
  return top.parent?.type === 'PAGE' ? top.name : null;
}

/** The page that holds the node; null off a page. */
function pageOf(node: Ancestor): { id: string; name: string } | null {
  for (let up: Ancestor | null | undefined = node; up; up = up.parent) {
    if (up.type === 'PAGE') return { id: up.id, name: up.name };
  }
  return null;
}

/** Whether the node is a component or a component set, or sits inside one. */
function inComponentSource(node: Ancestor): boolean {
  for (let up: Ancestor | null | undefined = node; up; up = up.parent) {
    if (up.type === 'COMPONENT' || up.type === 'COMPONENT_SET') return true;
  }
  return false;
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

/** Whether an instance holds the node, whose text is then the instance's to report. */
function insideInstance(node: Ancestor): boolean {
  for (let up = node.parent; up; up = up.parent) if (up.type === 'INSTANCE') return true;
  return false;
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

/** What the rules read of one node. `mixed` is `figma.mixed`, passed in so a spec can stand one in. */
export async function snapshotNode(
  node: SceneNode,
  created: boolean,
  mixed: symbol = typeof figma === 'undefined' ? Symbol('mixed') : figma.mixed,
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
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    parentId: any.parent?.id ?? null,
    frame: frameOf(node as unknown as Ancestor),
    created,
    fills: paints(any['fills']),
    strokes: paints(any['strokes']),
    textStyleId:
      node.type !== 'TEXT' ? null : style === mixed ? 'mixed' : typeof style === 'string' && style ? style : null,
    ...(node.type === 'TEXT' && !insideInstance(node as unknown as Ancestor)
      ? { characters: String(any['characters'] ?? '') }
      : {}),
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
          }
        : null,
    spacing: auto
      ? SPACING.map((field) => ({ field, value: Number(any[field] ?? 0), bound: Boolean(any.boundVariables?.[field]) }))
      : [],
    page: pageOf(node as unknown as Ancestor),
    componentSource: inComponentSource(node as unknown as Ancestor),
    ...(node.type === 'COMPONENT_SET' ? { set: setLayout(any) } : {}),
  };
}
