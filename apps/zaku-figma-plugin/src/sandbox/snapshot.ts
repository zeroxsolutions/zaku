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
    instance:
      node.type === 'INSTANCE'
        ? {
            overrides: ((any['overrides'] as { id: string; overriddenFields: string[] }[] | undefined) ?? []).map(
              (o) => ({
                nodeId: o.id,
                fields: o.overriddenFields,
                ...(o.overriddenFields.includes('fills') && holdsPicture(layerOf(node, o.id)) ? { picture: true } : {}),
              }),
            ),
            sizing: {
              horizontal: String(any['layoutSizingHorizontal'] ?? 'FIXED'),
              vertical: String(any['layoutSizingVertical'] ?? 'FIXED'),
            },
          }
        : null,
    spacing: auto
      ? SPACING.map((field) => ({ field, value: Number(any[field] ?? 0), bound: Boolean(any.boundVariables?.[field]) }))
      : [],
  };
}
