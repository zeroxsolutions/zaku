import type { OutlineNode } from '@zeroxsolutions/zaku/schema';

type Loose = Record<string, unknown> & { id: string; name: string; type: string };

/** The variable ids a node's fields are bound to; a paint field holds a list, the rest one alias. */
function boundIds(bound: unknown): [string, string][] {
  if (!bound || typeof bound !== 'object') return [];
  const out: [string, string][] = [];
  for (const [field, alias] of Object.entries(bound as Record<string, unknown>)) {
    const first = Array.isArray(alias) ? alias[0] : alias;
    if (first && typeof first === 'object' && typeof (first as { id?: unknown }).id === 'string')
      out.push([field, (first as { id: string }).id]);
  }
  return out;
}

/** An outline of a node and, to the depth asked, its children. */
export async function outlineNode(
  node: SceneNode,
  depth: number,
  resolveVariable: (id: string) => Promise<string | null>,
): Promise<OutlineNode> {
  const any = node as unknown as Loose;
  const auto = typeof any['layoutMode'] === 'string' && any['layoutMode'] !== 'NONE';
  const bound: Record<string, string> = {};
  for (const [field, id] of boundIds(any['boundVariables'])) {
    const name = await resolveVariable(id);
    if (name) bound[field] = name;
  }
  let component: OutlineNode['component'] = null;
  if (node.type === 'INSTANCE') {
    const main = await (node as InstanceNode).getMainComponentAsync();
    if (main) {
      const set = main.parent?.type === 'COMPONENT_SET';
      component = { name: set ? (main.parent as ComponentSetNode).name : main.name, variant: set ? main.name : null };
    }
  }
  const outline: OutlineNode = {
    id: node.id,
    name: node.name,
    type: node.type,
    width: Number(any['width'] ?? 0),
    height: Number(any['height'] ?? 0),
    layout: auto
      ? {
          mode: String(any['layoutMode']),
          padding: [
            Number(any['paddingTop'] ?? 0),
            Number(any['paddingRight'] ?? 0),
            Number(any['paddingBottom'] ?? 0),
            Number(any['paddingLeft'] ?? 0),
          ],
          gap: Number(any['itemSpacing'] ?? 0),
        }
      : null,
    bound,
    component,
    text: node.type === 'TEXT' ? String(any['characters'] ?? '') : null,
  };
  const children = any['children'];
  if (depth > 0 && Array.isArray(children)) {
    outline.children = [];
    for (const child of children as SceneNode[])
      outline.children.push(await outlineNode(child, depth - 1, resolveVariable));
  }
  return outline;
}
