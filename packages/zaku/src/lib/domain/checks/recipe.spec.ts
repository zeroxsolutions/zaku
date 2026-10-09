import type { RecipeDocument, RecipePart } from '../recipe.js';
import type { LibraryItem } from '../library.js';
import { testConfig, testInput, testItem, testLibrary } from '../../../test/fixtures.fixture.js';
import { recipe } from './recipe.js';

const config = testConfig({ modes: {} });
const part: RecipePart = {
  background: null,
  color: null,
  borderColor: null,
  width: 80,
  height: 32,
  padding: [0, 10, 0, 10],
  gap: 6,
  radii: [8, 8, 8, 8],
  borderWidths: [0, 0, 0, 0],
  fontSize: null,
  fontFamily: null,
};

function doc(root: Partial<RecipePart>, label: Partial<RecipePart>): RecipeDocument {
  return {
    components: [
      {
        name: 'Button',
        variants: [
          {
            props: { variant: 'default', size: 'default' },
            scheme: 'light',
            parts: {
              root: { ...part, background: { r: 0, g: 0.4782, b: 0.3335, a: 1 }, ...root },
              label: {
                ...part,
                color: { r: 0.9243, g: 0.992, b: 0.9602, a: 1 },
                padding: [0, 0, 0, 0],
                gap: null,
                radii: null,
                fontSize: 14,
                fontFamily: 'Inter, sans-serif',
                ...label,
              },
            },
          },
        ],
      },
    ],
  };
}

describe('recipe', () => {
  it('does not run without both the recipe and the snapshot', () => {
    expect(recipe(testInput())).toEqual({ notRun: 'recipe.json or library.json is missing' });
  });

  it('passes a variant whose root and label match the code within tolerance', () => {
    expect(recipe(testInput({ config, library: testLibrary(), recipe: doc({ height: 32.3 }, { width: 80 }) }))).toEqual(
      { findings: [] },
    );
  });

  it('reports a label colour off the code recipe, and a font family as a font finding', () => {
    const off = doc({}, { color: { r: 1, g: 1, b: 1, a: 1 }, fontFamily: 'Geist, sans-serif' });
    expect(recipe(testInput({ config, library: testLibrary(), recipe: off }))).toEqual({
      findings: [
        {
          check: 'recipe',
          nodeId: '100:2',
          field: 'color',
          message:
            'Button variant=default, size=default label: color is #ecfdf5 in the library and #ffffff in code (light)',
        },
        {
          check: 'font',
          nodeId: '100:2',
          field: 'fontFamily',
          message: 'Button variant=default, size=default label: font family is Inter in the library and Geist in code',
        },
      ],
    });
  });

  it('takes a library family the code stack falls back to as the code font, a system face it cannot draw being first', () => {
    const stack = '-apple-system, "system-ui", "Segoe UI", Inter, "Helvetica Neue", sans-serif';
    expect(recipe(testInput({ config, library: testLibrary(), recipe: doc({}, { fontFamily: stack }) }))).toEqual({
      findings: [],
    });
    const elsewhere = recipe(
      testInput({
        config,
        library: testLibrary(),
        recipe: doc({}, { fontFamily: '-apple-system, Roboto, sans-serif' }),
      }),
    );
    expect(elsewhere).toEqual({
      findings: [
        {
          check: 'font',
          nodeId: '100:2',
          field: 'fontFamily',
          message:
            'Button variant=default, size=default label: font family is Inter in the library and -apple-system, Roboto in code',
        },
      ],
    });
  });

  it('leaves a width set by text out when the library draws a fallback face the code does not render', () => {
    const fallback = '-apple-system, Inter, sans-serif';
    expect(
      recipe(
        testInput({
          config,
          library: testLibrary(),
          recipe: doc({ width: 80.98 }, { fontFamily: fallback }),
        }),
      ),
    ).toEqual({ findings: [] });
    const same = recipe(testInput({ config, library: testLibrary(), recipe: doc({ width: 80.98 }, {}) }));
    expect(same).toEqual({
      findings: [expect.objectContaining({ check: 'recipe', field: 'width' })],
    });
  });

  it('reports a code variant the library does not have as a library finding', () => {
    const extra = doc({}, {});
    const first = extra.components[0]?.variants[0];
    if (first)
      extra.components[0]?.variants.push({
        ...first,
        props: { variant: 'ghost', size: 'default' },
      });
    expect(recipe(testInput({ config, library: testLibrary(), recipe: extra }))).toEqual({
      findings: [
        {
          check: 'library',
          message: 'Button variant=ghost, size=default (light) has no library variant',
        },
      ],
    });
  });
});

describe('recipe, on the parts a field belongs to', () => {
  it('compares a text colour only on a text layer', () => {
    const library = testLibrary();
    const root = library.components[0]?.variants[0]?.modes[0]?.items[0];
    if (root) root.textColor = { r: 1, g: 0, b: 0, a: 1 };
    expect(recipe(testInput({ config, library, recipe: doc({}, {}) }))).toEqual({ findings: [] });
  });
});

describe('recipe check on an icon', () => {
  function runWithIcon(glyph: LibraryItem['glyph'], coded: RecipePart['color']): string[] {
    const library = testLibrary();
    const icon = library.components[0]?.variants[0]?.modes[0]?.items.find((item) => item.path === 'Icon');
    if (icon) icon.glyph = glyph;
    const component = library.components[0];
    if (component?.map) component.map.parts['Icon'] = 'icon';
    const code = doc({}, { width: 80 });
    const variant = code.components[0]?.variants[0];
    if (variant)
      variant.parts['icon'] = {
        ...part,
        width: 16,
        height: 16,
        padding: [0, 0, 0, 0],
        gap: null,
        radii: null,
        color: coded,
      };
    const outcome = recipe(testInput({ config, library, recipe: code }));
    return 'findings' in outcome ? outcome.findings.map((finding) => `${finding.field ?? ''}: ${finding.message}`) : [];
  }

  it('reports an icon drawn in another colour than the one the code renders it in', () => {
    const white = { r: 0.9243, g: 0.992, b: 0.9602, a: 1 };
    expect(runWithIcon({ r: 0, g: 0, b: 0, a: 1 }, white)).toEqual([
      'glyph: Button variant=default, size=default icon: glyph is #000000 in the library and #ecfdf5 in code (light)',
    ]);
    expect(runWithIcon(white, white)).toEqual([]);
  });
});

describe('recipe check per side and per corner', () => {
  function runRecipeCheck(code: Partial<RecipePart>, drawn: Partial<LibraryItem>): string[] {
    const library = testLibrary();
    const items = library.components[0]?.variants[0]?.modes[0]?.items;
    if (items) items[0] = testItem(drawn);
    const outcome = recipe(testInput({ config, library, recipe: doc(code, { width: 80 }) }));
    return 'findings' in outcome ? outcome.findings.map((finding) => finding.field ?? '') : [];
  }

  it('compares each side border width', () => {
    // a card header: the code draws only a bottom border, the library draws none
    expect(runRecipeCheck({ borderWidths: [0, 0, 1, 0] }, { strokeWeights: [0, 0, 0, 0] })).toContain(
      'borderWidths[2]',
    );
  });

  it('compares each corner radius', () => {
    expect(runRecipeCheck({ radii: [8, 8, 0, 0] }, { radii: [8, 8, 8, 8] })).toEqual(
      expect.arrayContaining(['radii[2]', 'radii[3]']),
    );
  });
});

describe('recipe check on a rounded-full shape', () => {
  it('passes a badge whose radius token exceeds its box, as both sides draw the same pill', () => {
    const library = testLibrary();
    const items = library.components[0]?.variants[0]?.modes[0]?.items;
    if (items) items[0] = testItem({ width: 53, height: 20, radii: [26, 26, 26, 26] });
    const code = doc({ width: 53, height: 20, radii: [10, 10, 10, 10] }, { width: 80 });
    const outcome = recipe(testInput({ config, library, recipe: code }));
    const fields = 'findings' in outcome ? outcome.findings.map((finding) => finding.field) : [];
    expect(fields.filter((field) => field?.startsWith('radii'))).toEqual([]);
  });
});
