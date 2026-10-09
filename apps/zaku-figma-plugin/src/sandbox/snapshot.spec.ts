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
});
