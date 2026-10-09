import { outlineNode } from './outline.js';

const names: Record<string, string> = { v1: 'spacing/4', v2: 'color/primary' };
const resolve = async (id: string): Promise<string | null> => names[id] ?? null;

const text = { id: '1:3', name: 'Title', type: 'TEXT', width: 80, height: 20, characters: 'Hello', boundVariables: {} };
const inner = { id: '1:4', name: 'Inner', type: 'FRAME', width: 10, height: 10, layoutMode: 'NONE', children: [text] };
const card = {
  id: '1:1',
  name: 'Card',
  type: 'FRAME',
  width: 320,
  height: 200,
  layoutMode: 'VERTICAL',
  paddingTop: 16,
  paddingRight: 12,
  paddingBottom: 16,
  paddingLeft: 12,
  itemSpacing: 8,
  boundVariables: { itemSpacing: { id: 'v1' }, fills: [{ id: 'v2' }] },
  children: [text, inner],
};

describe('outlineNode', () => {
  it('reads an auto-layout frame, its bound variables and its children one level down', async () => {
    const outline = await outlineNode(card as never, 1, resolve);
    expect(outline).toMatchObject({
      id: '1:1',
      layout: { mode: 'VERTICAL', padding: [16, 12, 16, 12], gap: 8 },
      bound: { itemSpacing: 'spacing/4', fills: 'color/primary' },
      component: null,
      text: null,
    });
    expect(outline.children?.map((child) => child.id)).toEqual(['1:3', '1:4']);
    expect(outline.children?.[0]?.text).toBe('Hello');
    expect(outline.children?.[1]?.children).toBeUndefined();
    expect(outline.children?.[1]?.layout).toBeNull();
  });

  it('omits children at depth 0', async () => {
    expect((await outlineNode(card as never, 0, resolve)).children).toBeUndefined();
  });

  it('names the set and the variant of an instance', async () => {
    const instance = {
      id: '2:1',
      name: 'Button',
      type: 'INSTANCE',
      width: 80,
      height: 32,
      getMainComponentAsync: async (): Promise<{ name: string; parent: { type: string; name: string } }> => ({
        name: 'Variant=Primary',
        parent: { type: 'COMPONENT_SET', name: 'Button' },
      }),
    };
    expect((await outlineNode(instance as never, 0, resolve)).component).toEqual({
      name: 'Button',
      variant: 'Variant=Primary',
    });
  });
});
