import type { NodeSnapshot } from '../schema/bridge.js';
import { snapshotFindings } from './snapshot-rules.js';

const node = (patch: Partial<NodeSnapshot>): NodeSnapshot => ({
  id: '1:1',
  name: 'Card',
  type: 'FRAME',
  parentId: '0:1',
  frame: null,
  created: true,
  fills: [],
  strokes: [],
  textStyleId: null,
  instance: null,
  spacing: [],
  ...patch,
});

describe('snapshotFindings', () => {
  it('finds a fill and a stroke with no variable bound', () => {
    const findings = snapshotFindings([node({ fills: [{ bound: false }], strokes: [{ bound: false }] })]);
    expect(findings.map((f) => [f.check, f.field])).toEqual([
      ['binding', 'fill'],
      ['binding', 'stroke'],
    ]);
  });

  it('names the top-level frame the layer sits in, where it has one', () => {
    expect(snapshotFindings([node({ fills: [{ bound: false }], frame: 'Trips / Desktop' })])[0]).toMatchObject({
      frame: 'Trips / Desktop',
    });
    expect(snapshotFindings([node({ fills: [{ bound: false }] })])[0]).not.toHaveProperty('frame');
  });

  it('passes bound paints', () => {
    expect(snapshotFindings([node({ fills: [{ bound: true }] })])).toEqual([]);
  });

  it('finds a text with no style, and passes mixed styles', () => {
    expect(snapshotFindings([node({ type: 'TEXT', name: 'Title', textStyleId: null })])[0]).toMatchObject({
      check: 'binding',
      field: 'textStyle',
    });
    expect(snapshotFindings([node({ type: 'TEXT', name: 'Title', textStyleId: 'mixed' })])).toEqual([]);
  });

  it('finds a padding or gap with no variable bound, and passes zero', () => {
    const findings = snapshotFindings([
      node({
        spacing: [
          { field: 'paddingTop', value: 12, bound: false },
          { field: 'itemSpacing', value: 0, bound: false },
          { field: 'paddingLeft', value: 16, bound: true },
        ],
      }),
    ]);
    expect(findings.map((f) => f.field)).toEqual(['paddingTop']);
  });

  it('finds an override outside what a product frame may change', () => {
    const instance = {
      overrides: [{ nodeId: '1:1;2:3', fields: ['fills', 'characters'] }],
      sizing: { horizontal: 'FIXED', vertical: 'HUG' },
    };
    const findings = snapshotFindings([node({ type: 'INSTANCE', name: 'Button', instance })]);
    expect(findings).toEqual([expect.objectContaining({ check: 'overrides', nodeId: '1:1;2:3', field: 'fills' })]);
  });

  it('lets an instance be stretched when it is not fixed on that axis', () => {
    const instance = {
      overrides: [{ nodeId: '1:1', fields: ['width', 'height'] }],
      sizing: { horizontal: 'FILL', vertical: 'FIXED' },
    };
    const findings = snapshotFindings([node({ id: '1:1', type: 'INSTANCE', name: 'Button', instance })]);
    expect(findings.map((f) => f.field)).toEqual(['height']);
  });

  it('finds a default layer name, but not on a text, which is named for its copy', () => {
    expect(snapshotFindings([node({ name: 'Frame 12' })])[0]).toMatchObject({ check: 'naming' });
    expect(snapshotFindings([node({ type: 'TEXT', name: 'Rectangle', textStyleId: 's' })])).toEqual([]);
  });

  it('lets a picture be placed in an instance, as zaku check does', () => {
    const instance = {
      overrides: [{ nodeId: '1:1;2:9', fields: ['fills'], picture: true }],
      sizing: { horizontal: 'FIXED', vertical: 'FIXED' },
    };
    expect(snapshotFindings([node({ type: 'INSTANCE', name: 'Avatar', instance })])).toEqual([]);
  });

  it('holds a text outside an instance and a characters override to the copy rules', () => {
    const text = node({
      id: '1:2',
      type: 'TEXT',
      name: 'Summary',
      textStyleId: 's',
      characters: 'A port \u2014 five sites',
    });
    const instance = {
      overrides: [{ nodeId: '1:3;2:1', fields: ['characters'], characters: 'Unlock the map \u2192' }],
      carried: ['Next \u2192'],
      sizing: { horizontal: 'HUG', vertical: 'HUG' },
    };
    expect(snapshotFindings([text, node({ id: '1:3', type: 'INSTANCE', name: 'Button', instance })])).toEqual([
      {
        check: 'copy',
        nodeId: '1:2',
        field: 'characters',
        message: 'Summary (text): U+2014 em dash: write "-", or two sentences',
      },
      { check: 'copy', nodeId: '1:3;2:1', field: 'tone', message: 'Button: "Unlock": write "get" or "open"' },
    ]);
  });

  it('allows the letters and currency symbols of the locales and currencies zaku.yaml names', () => {
    const text = node({ type: 'TEXT', name: 'Price', textStyleId: 's', characters: 'V\u00e9 120.000 \u20ab' });
    expect(snapshotFindings([text], { locales: ['en', 'vi'], currencies: ['VND'] })).toEqual([]);
    expect(snapshotFindings([text])).toEqual([expect.objectContaining({ check: 'copy', field: 'characters' })]);
  });
  describe('in the library file', () => {
    const entryPage = { id: '0:7', name: '\u2756 Tag' };
    const rawSpacing = [{ field: 'paddingTop' as const, value: 48, bound: false }];

    it("leaves a documentation view's measures and its unstyled text to the reference", () => {
      const header = node({ name: 'Body', page: entryPage, componentSource: false, spacing: rawSpacing });
      const label = node({ type: 'TEXT', name: 'sm', page: entryPage, componentSource: false });
      expect(snapshotFindings([header, label])).toEqual([]);
    });

    it('holds a documentation view to its colour bindings', () => {
      const view = node({ name: 'Nova / Tag', page: entryPage, componentSource: false, fills: [{ bound: false }] });
      expect(snapshotFindings([view]).map((f) => f.field)).toEqual(['fill']);
    });

    it('holds a component on an entry page to every rule', () => {
      const variant = node({
        type: 'COMPONENT',
        name: 'Variant=filled',
        page: entryPage,
        componentSource: true,
        parentId: '5:1',
        spacing: rawSpacing,
      });
      expect(snapshotFindings([variant]).map((f) => f.field)).toEqual(['paddingTop']);
    });

    it('leaves the documentation components and the cover to the reference', () => {
      const docs = node({
        type: 'COMPONENT',
        name: 'DS/Header',
        page: { id: '0:2', name: 'Component for Docs' },
        componentSource: true,
        spacing: rawSpacing,
      });
      const cover = node({ name: 'Intro', page: { id: '0:1', name: 'Thumbnail' }, spacing: rawSpacing });
      expect(snapshotFindings([docs, cover])).toEqual([]);
    });

    it('holds a frame on any other page to the spacing rule', () => {
      const screen = node({ name: 'Trips', page: { id: '0:9', name: 'Trips' }, spacing: rawSpacing });
      expect(snapshotFindings([screen]).map((f) => f.field)).toEqual(['paddingTop']);
    });

    it('finds a component set or a component placed on an entry page outside its view', () => {
      const set = node({ id: '5:1', type: 'COMPONENT_SET', name: 'Tag', page: entryPage, parentId: '0:7' });
      const icon = node({ id: '5:2', type: 'COMPONENT', name: 'lucide/bell', page: entryPage, parentId: '0:7' });
      const inside = node({ id: '5:3', type: 'COMPONENT_SET', name: 'Card', page: entryPage, parentId: '4:1' });
      expect(snapshotFindings([set, icon, inside])).toEqual([
        expect.objectContaining({ check: 'placement', nodeId: '5:1' }),
        expect.objectContaining({ check: 'placement', nodeId: '5:2' }),
      ]);
    });
  });

  describe('a component set', () => {
    const variant = (id: string, x: number, y: number): NonNullable<NodeSnapshot['set']>['variants'][number] => ({
      id,
      name: `State=${id}`,
      x,
      y,
      width: 60,
      height: 24,
    });

    it('passes variants laid out apart inside it', () => {
      const set = node({
        type: 'COMPONENT_SET',
        name: 'Tag',
        set: { width: 200, height: 120, variants: [variant('a', 32, 32), variant('b', 108, 32), variant('c', 32, 64)] },
      });
      expect(snapshotFindings([set])).toEqual([]);
    });

    it('finds two variants drawn on top of each other', () => {
      const set = node({
        type: 'COMPONENT_SET',
        name: 'Card',
        set: { width: 200, height: 120, variants: [variant('a', 0, 0), variant('b', 0, 0)] },
      });
      expect(snapshotFindings([set])).toEqual([
        expect.objectContaining({ check: 'overlap', nodeId: 'a', message: 'Card: State=a overlaps State=b' }),
      ]);
    });

    it('finds a variant cut off by the edge of its set', () => {
      const set = node({
        type: 'COMPONENT_SET',
        name: 'Tag',
        set: { width: 1000, height: 100, variants: [variant('a', 32, 32), variant('b', 32, 88)] },
      });
      expect(snapshotFindings([set])).toEqual([
        expect.objectContaining({
          check: 'overlap',
          nodeId: 'b',
          message: 'Tag: State=b reaches past the set, which cuts it off',
        }),
      ]);
    });

    it('passes variants that only touch', () => {
      const set = node({
        type: 'COMPONENT_SET',
        name: 'Tag',
        set: { width: 120, height: 24, variants: [variant('a', 0, 0), variant('b', 60, 0)] },
      });
      expect(snapshotFindings([set])).toEqual([]);
    });
  });
});
