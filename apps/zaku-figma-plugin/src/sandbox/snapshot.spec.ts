import { snapshotNode } from './snapshot.js';

describe('snapshotNode', () => {
  it('reads solid paints and whether a variable colours them', async () => {
    const node = {
      id: '1:1',
      name: 'Card',
      type: 'FRAME',
      parent: { id: '0:1' },
      fills: [
        { type: 'SOLID', visible: true, opacity: 1, boundVariables: {} },
        { type: 'IMAGE', visible: true },
      ],
      strokes: [{ type: 'SOLID', visible: true, opacity: 1, boundVariables: { color: { id: 'v' } } }],
      layoutMode: 'VERTICAL',
      paddingTop: 12,
      paddingRight: 0,
      paddingBottom: 12,
      paddingLeft: 0,
      itemSpacing: 8,
      boundVariables: { paddingTop: { id: 'v2' } },
    };
    expect(await snapshotNode(node as never, true)).toMatchObject({
      fills: [{ bound: false }],
      strokes: [{ bound: true }],
      spacing: [
        { field: 'paddingTop', value: 12, bound: true },
        { field: 'paddingRight', value: 0, bound: false },
        { field: 'paddingBottom', value: 12, bound: false },
        { field: 'paddingLeft', value: 0, bound: false },
        { field: 'itemSpacing', value: 8, bound: false },
      ],
    });
  });

  it('names the top-level frame on the page that holds the node, the node itself included', async () => {
    const page = { id: '0:1', name: 'Page 1', type: 'PAGE', parent: null };
    const screen = { id: '1:1', name: 'Trips / Desktop', type: 'FRAME', parent: page, fills: [], strokes: [] };
    const card = { id: '1:2', name: 'Card', type: 'FRAME', parent: screen, fills: [], strokes: [] };
    const label = { id: '1:3', name: 'Label', type: 'RECTANGLE', parent: card, fills: [], strokes: [] };
    expect((await snapshotNode(label as never, true)).frame).toBe('Trips / Desktop');
    expect((await snapshotNode(screen as never, true)).frame).toBe('Trips / Desktop');
    expect((await snapshotNode({ ...card, parent: null } as never, true)).frame).toBeNull();
  });

  it('skips a hidden or transparent paint', async () => {
    const node = {
      id: '1:1',
      name: 'X',
      type: 'RECTANGLE',
      parent: null,
      fills: [
        { type: 'SOLID', visible: false },
        { type: 'SOLID', visible: true, opacity: 0 },
      ],
      strokes: [],
    };
    expect((await snapshotNode(node as never, true)).fills).toEqual([]);
  });

  it('reads a text style, mixed included', async () => {
    const mixed = Symbol('mixed');
    const text = { id: '1:2', name: 'T', type: 'TEXT', parent: null, fills: [], strokes: [], textStyleId: mixed };
    expect((await snapshotNode(text as never, true, mixed)).textStyleId).toBe('mixed');
    expect((await snapshotNode({ ...text, textStyleId: '' } as never, true, mixed)).textStyleId).toBeNull();
  });

  it('reads an instance overrides and sizing', async () => {
    const instance = {
      id: '1:3',
      name: 'Button',
      type: 'INSTANCE',
      parent: null,
      fills: [],
      strokes: [],
      overrides: [{ id: '1:3', overriddenFields: ['fills'] }],
      layoutSizingHorizontal: 'FILL',
      layoutSizingVertical: 'HUG',
    };
    expect((await snapshotNode(instance as never, false)).instance).toEqual({
      overrides: [{ nodeId: '1:3', fields: ['fills'] }],
      sizing: { horizontal: 'FILL', vertical: 'HUG' },
    });
  });

  it('marks a fills override on a layer that holds a picture', async () => {
    const photo = { id: '1:3;9:1', fills: [{ type: 'IMAGE', visible: true }] };
    const instance = {
      id: '1:3',
      name: 'Avatar',
      type: 'INSTANCE',
      parent: null,
      fills: [],
      strokes: [],
      overrides: [{ id: '1:3;9:1', overriddenFields: ['fills'] }],
      layoutSizingHorizontal: 'FIXED',
      layoutSizingVertical: 'FIXED',
      findOne: (match: (n: unknown) => boolean): unknown => (match(photo) ? photo : null),
    };
    expect((await snapshotNode(instance as never, false)).instance?.overrides).toEqual([
      { nodeId: '1:3;9:1', fields: ['fills'], picture: true },
    ]);
  });

  it("carries a text's characters, and none for a text an instance holds", async () => {
    const page = { id: '0:1', name: 'Page 1', type: 'PAGE', parent: null };
    const screen = { id: '1:1', name: 'Place / Desktop', type: 'FRAME', parent: page };
    const button = { id: '1:3', name: 'Button', type: 'INSTANCE', parent: screen };
    const text = {
      id: '1:2',
      name: 'Summary',
      type: 'TEXT',
      parent: screen,
      fills: [],
      strokes: [],
      characters: 'Hoi An',
    };
    const label = { ...text, id: 'I1:3;2:1', name: 'Label', parent: button, characters: 'Save' };
    expect((await snapshotNode(text as never, true)).characters).toBe('Hoi An');
    expect(await snapshotNode(label as never, false)).not.toHaveProperty('characters');
  });

  it('carries the text of a characters override, and the texts the component shows as its own', async () => {
    const label = { id: '1:3;9:1', type: 'TEXT', characters: 'Book now' };
    const hint = { id: '1:3;9:2', type: 'TEXT', characters: 'Next \u2192' };
    const instance = {
      id: '1:3',
      name: 'Button',
      type: 'INSTANCE',
      parent: null,
      fills: [],
      strokes: [],
      overrides: [{ id: '1:3;9:1', overriddenFields: ['characters'] }],
      layoutSizingHorizontal: 'HUG',
      layoutSizingVertical: 'HUG',
      findOne: (match: (n: unknown) => boolean): unknown => [label, hint].find((n) => match(n)) ?? null,
      findAll: (match: (n: unknown) => boolean): unknown[] => [label, hint].filter((n) => match(n)),
    };
    expect((await snapshotNode(instance as never, false)).instance).toEqual({
      overrides: [{ nodeId: '1:3;9:1', fields: ['characters'], characters: 'Book now' }],
      carried: ['Next \u2192'],
      sizing: { horizontal: 'HUG', vertical: 'HUG' },
    });
  });
  it('names the page that holds the node, and whether a component holds it', async () => {
    const page = { id: '0:7', name: '\u2756 Tag', type: 'PAGE', parent: null };
    const view = { id: '1:1', name: 'Nova / Tag', type: 'FRAME', parent: page, fills: [], strokes: [] };
    const set = { id: '1:2', name: 'Tag', type: 'COMPONENT_SET', parent: view, fills: [], strokes: [], children: [] };
    const variant = { id: '1:3', name: 'State=Default', type: 'COMPONENT', parent: set, fills: [], strokes: [] };
    const label = { id: '1:4', name: 'Label', type: 'TEXT', parent: variant, fills: [], strokes: [] };
    expect(await snapshotNode(view as never, true)).toMatchObject({
      page: { id: '0:7', name: '\u2756 Tag' },
      componentSource: false,
    });
    expect((await snapshotNode(set as never, true)).componentSource).toBe(true);
    expect((await snapshotNode(label as never, true)).componentSource).toBe(true);
    expect((await snapshotNode({ ...view, parent: null } as never, true)).page).toBeNull();
  });

  it("reads a component set's size and each variant's box", async () => {
    const variant = (id: string, x: number): Record<string, unknown> => ({
      id,
      name: `State=${id}`,
      type: 'COMPONENT',
      x,
      y: 32,
      width: 60,
      height: 24,
    });
    const set = {
      id: '1:2',
      name: 'Tag',
      type: 'COMPONENT_SET',
      parent: null,
      fills: [],
      strokes: [],
      width: 1000,
      height: 100,
      children: [variant('1:3', 32), variant('1:4', 124)],
    };
    expect((await snapshotNode(set as never, true)).set).toEqual({
      width: 1000,
      height: 100,
      variants: [
        { id: '1:3', name: 'State=1:3', x: 32, y: 32, width: 60, height: 24 },
        { id: '1:4', name: 'State=1:4', x: 124, y: 32, width: 60, height: 24 },
      ],
    });
  });

  describe('what the documentation rule reads', () => {
    const page = { id: '0:2', name: 'Component for Docs', type: 'PAGE', parent: null };

    it("reads a frame's place, size, sizing and auto layout", async () => {
      const frame = {
        id: '1:1',
        name: 'DS/Table Cell',
        type: 'COMPONENT_SET',
        parent: page,
        fills: [],
        strokes: [],
        children: [],
        x: 0,
        y: 522,
        width: 500,
        height: 84,
        layoutSizingHorizontal: 'FIXED',
        layoutSizingVertical: 'HUG',
        layoutMode: 'HORIZONTAL',
        layoutWrap: 'WRAP',
        paddingTop: 24,
        paddingRight: 24,
        paddingBottom: 24,
        paddingLeft: 24,
        itemSpacing: 24,
        counterAxisSpacing: 24,
        primaryAxisAlignItems: 'MIN',
        counterAxisAlignItems: 'MIN',
        componentPropertyDefinitions: {
          'Text#200:4': { type: 'TEXT', defaultValue: 'Cell' },
          Emphasis: { type: 'VARIANT', defaultValue: 'primary' },
        },
      };
      expect(await snapshotNode(frame as never, false)).toMatchObject({
        box: {
          x: 0,
          y: 522,
          width: 500,
          height: 84,
          sizing: { horizontal: 'FIXED', vertical: 'HUG' },
          layout: 'HORIZONTAL',
          wrap: true,
          padding: [24, 24, 24, 24],
          gap: 24,
          crossGap: 24,
          align: ['MIN', 'MIN'],
        },
        properties: [
          { name: 'Text', type: 'TEXT', default: 'Cell' },
          { name: 'Emphasis', type: 'VARIANT', default: 'primary' },
        ],
      });
    });

    it("reads a grid's column and row gaps", async () => {
      const grid = {
        id: '1:1',
        name: 'Cards',
        type: 'FRAME',
        parent: page,
        fills: [],
        strokes: [],
        layoutMode: 'GRID',
        gridColumnGap: 16,
        gridRowGap: 12,
        itemSpacing: 0,
      };
      expect((await snapshotNode(grid as never, false)).box).toMatchObject({ layout: 'GRID', gap: 16, crossGap: 12 });
    });

    it("reads a text's size, line height in px and style", async () => {
      const text = {
        id: '1:2',
        name: 'Title',
        type: 'TEXT',
        parent: page,
        fills: [],
        strokes: [],
        characters: 'Section title',
        fontSize: 30,
        lineHeight: { unit: 'PIXELS', value: 36 },
        fontName: { family: 'Roboto', style: 'SemiBold' },
        layoutSizingHorizontal: 'FILL',
        layoutSizingVertical: 'HUG',
      };
      expect((await snapshotNode(text as never, false)).font).toEqual({ size: 30, lineHeight: 36, style: 'SemiBold' });
      const percent = { ...text, lineHeight: { unit: 'PERCENT', value: 150 }, fontSize: 16 };
      expect((await snapshotNode(percent as never, false)).font).toMatchObject({ lineHeight: 24 });
      const auto = { ...text, lineHeight: { unit: 'AUTO' } };
      expect((await snapshotNode(auto as never, false)).font).toMatchObject({ lineHeight: 'auto' });
    });

    it("names an instance's component, the set's name for a variant", async () => {
      const set = { id: '5:1', name: 'Badge', type: 'COMPONENT_SET' };
      const instance = {
        id: '1:3',
        name: 'Badge \u00b7 secondary',
        type: 'INSTANCE',
        parent: page,
        fills: [],
        strokes: [],
        overrides: [],
        getMainComponentAsync: async (): Promise<object> => ({ name: 'Variant=secondary', parent: set }),
      };
      expect((await snapshotNode(instance as never, false)).main).toBe('Badge');
    });

    it('reads no properties off a variant, which keeps them on its set', async () => {
      const variant = {
        id: '1:4',
        name: 'Emphasis=primary',
        type: 'COMPONENT',
        parent: { id: '1:1', name: 'DS/Table Cell', type: 'COMPONENT_SET', parent: page },
        fills: [],
        strokes: [],
        get componentPropertyDefinitions(): never {
          throw new Error('Can only get component property definitions of a component set or non-variant component');
        },
      };
      expect(await snapshotNode(variant as never, false)).not.toHaveProperty('properties');
    });
  });
});
