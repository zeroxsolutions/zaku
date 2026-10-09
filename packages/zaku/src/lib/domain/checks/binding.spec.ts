import { testInput, testItem, testLibrary } from '../../../test/fixtures.fixture.js';
import { binding } from './binding.js';

describe('binding', () => {
  it('passes a library whose paints, radii and texts are all bound', () => {
    expect(binding(testInput({ library: testLibrary() }))).toEqual({ findings: [] });
  });

  it('reports a raw label colour and a text with no text style, by node id', () => {
    const library = testLibrary();
    const items = library.components[0]?.variants[0]?.modes[0]?.items ?? [];
    items[1] = testItem({
      nodeId: '100:2',
      path: 'Label',
      type: 'TEXT',
      fill: null,
      textColor: { r: 1, g: 1, b: 1, a: 1 },
      radii: null,
      padding: null,
      gap: null,
      textStyleKey: null,
      bindings: { textColor: null },
    });
    expect(binding(testInput({ library }))).toEqual({
      findings: [
        {
          check: 'binding',
          nodeId: '100:2',
          field: 'textColor',
          message: 'Button Variant=default, Size=default Label: textColor is a raw value',
        },
        {
          check: 'binding',
          nodeId: '100:2',
          field: 'textStyle',
          message: 'Button Variant=default, Size=default Label: text has no library text style',
        },
      ],
    });
  });
});

describe('binding, on an icon', () => {
  it('reports an icon whose glyph is drawn in a raw colour', () => {
    const library = testLibrary();
    const icon = library.components[0]?.variants[0]?.modes[0]?.items.find((item) => item.path === 'Icon');
    if (icon) {
      icon.glyph = { r: 0, g: 0, b: 0, a: 1 };
      icon.bindings['glyph'] = null;
    }
    expect(binding(testInput({ library }))).toEqual({
      findings: [
        {
          check: 'binding',
          nodeId: '100:3',
          field: 'glyph',
          message: 'Button Variant=default, Size=default Icon: glyph is a raw value',
        },
      ],
    });
  });
});

describe('binding, to the wrong layer of tokens', () => {
  it('reports a paint bound to an axis token rather than a semantic one', () => {
    const library = testLibrary();
    const root = library.components[0]?.variants[0]?.modes[0]?.items[0];
    if (root) root.bindings = { ...root.bindings, fill: 'light/primary' };
    expect(binding(testInput({ library }))).toEqual({
      findings: [
        {
          check: 'binding',
          nodeId: '100:1',
          field: 'fill',
          message:
            'Button Variant=default, Size=default (root): fill is bound to light/primary, which is not a semantic token',
        },
      ],
    });
  });
});
