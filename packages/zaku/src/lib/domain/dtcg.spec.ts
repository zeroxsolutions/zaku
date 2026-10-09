import { join } from 'node:path';
import { zakuConfigSchema, type DtcgSystem } from '../schema/zaku-config.js';
import { dtcgTokenDocument, flattenTokens, loadDtcgSchemes, type ReadJson } from './dtcg.js';
import { tokenSets } from './token-document.js';

function system(dtcg: Record<string, unknown>): DtcgSystem {
  const config = zakuConfigSchema.parse({
    product: 'p',
    designSystem: { dtcg },
    figma: { library: 'L', product: 'P' },
    targets: [{ id: 'web-desktop', family: 'web', name: 'Desktop' }],
  });
  if (!('dtcg' in config.designSystem)) throw new Error('not dtcg');
  return config.designSystem.dtcg;
}

function reader(files: Record<string, unknown>): ReadJson {
  return async (path) => {
    if (!(path in files)) throw new Error(`no file ${path}`);
    return files[path];
  };
}

const ROOT = '/repo';

const base = {
  palette: {
    $type: 'color',
    green: { $value: { colorSpace: 'srgb', components: [0, 0.478, 0.333], alpha: 1 } },
    white: { $value: '#ffffff' },
    ink: { $value: { colorSpace: 'oklch', components: [0.141, 0.005, 285.823] } },
  },
  radius: {
    $type: 'dimension',
    md: { $value: { value: 0.5, unit: 'rem' } },
    lg: { $value: '10px' },
  },
};
const light = {
  color: {
    $type: 'color',
    primary: { $value: '{palette.green}' },
    surface: { $value: '{palette.white}' },
    text: { $value: '{palette.ink}' },
  },
};
const dark = {
  color: {
    $type: 'color',
    primary: { $value: '{palette.green}' },
    surface: { $value: '{palette.ink}' },
    text: { $value: '{palette.white}' },
  },
};

describe('flattenTokens', () => {
  it('names each token by its path, takes its type from the nearest group, and resolves aliases', () => {
    const flat = flattenTokens({ ...base, ...light });
    expect(flat.get('color.primary')).toMatchObject({
      type: 'color',
      value: { colorSpace: 'srgb', components: [0, 0.478, 0.333], alpha: 1 },
    });
    expect(flat.get('radius.md')).toMatchObject({
      type: 'dimension',
      value: { value: 0.5, unit: 'rem' },
    });
  });

  it('names the token an alias cannot reach, and a cycle', () => {
    expect(() => flattenTokens({ color: { $type: 'color', a: { $value: '{color.missing}' } } })).toThrow(
      'color.a refers to color.missing, which no token is',
    );
    expect(() =>
      flattenTokens({
        color: { $type: 'color', a: { $value: '{color.b}' }, b: { $value: '{color.a}' } },
      }),
    ).toThrow('color.a is an alias cycle');
  });
});

describe('loadDtcgSchemes', () => {
  it('merges the token files of each scheme in order, a later file winning', async () => {
    const read = reader({
      [join(ROOT, 'base.json')]: base,
      [join(ROOT, 'light.json')]: light,
      [join(ROOT, 'dark.json')]: dark,
    });
    const schemes = await loadDtcgSchemes(
      system({ light: ['base.json', 'light.json'], dark: ['base.json', 'dark.json'] }),
      read,
      ROOT,
    );
    expect(schemes.dark.get('color.surface')?.value).toEqual({
      colorSpace: 'oklch',
      components: [0.141, 0.005, 285.823],
    });
  });

  it('resolves a resolver document: its sets, then the context each scheme picks for each modifier', async () => {
    const resolver = {
      version: '2025.10',
      sets: { base: { sources: [{ $ref: 'base.json' }] } },
      modifiers: {
        theme: {
          contexts: { light: [{ $ref: 'light.json' }], dark: [{ $ref: 'dark.json' }] },
          default: 'light',
        },
      },
      resolutionOrder: [{ $ref: '#/sets/base' }, { $ref: '#/modifiers/theme' }],
    };
    const dir = join(ROOT, 'tokens');
    const read = reader({
      [join(dir, 'resolver.json')]: resolver,
      [join(dir, 'base.json')]: base,
      [join(dir, 'light.json')]: light,
      [join(dir, 'dark.json')]: dark,
    });
    const schemes = await loadDtcgSchemes(
      system({
        resolver: 'tokens/resolver.json',
        light: { theme: 'light' },
        dark: { theme: 'dark' },
      }),
      read,
      ROOT,
    );
    expect(schemes.light.get('color.surface')?.value).toBe('#ffffff');
    expect(schemes.dark.get('color.text')?.value).toBe('#ffffff');
  });

  it('refuses a context the resolver does not have', async () => {
    const resolver = {
      version: '2025.10',
      modifiers: { theme: { contexts: { light: [] } } },
      resolutionOrder: [{ $ref: '#/modifiers/theme' }],
    };
    const read = reader({ [join(ROOT, 'r.json')]: resolver });
    await expect(
      loadDtcgSchemes(system({ resolver: 'r.json', light: { theme: 'light' }, dark: { theme: 'night' } }), read, ROOT),
    ).rejects.toThrow('modifier theme has no context night');
  });
});

describe('dtcgTokenDocument', () => {
  it('takes the colour roles and radius steps from their groups, in sRGB and px', async () => {
    const read = reader({
      [join(ROOT, 'base.json')]: base,
      [join(ROOT, 'light.json')]: light,
      [join(ROOT, 'dark.json')]: dark,
    });
    const dtcg = system({ light: ['base.json', 'light.json'], dark: ['base.json', 'dark.json'] });
    const doc = dtcgTokenDocument(dtcg, await loadDtcgSchemes(dtcg, read, ROOT), 'acme');
    const sets = tokenSets(doc);
    expect(Object.keys(sets.light.color)).toEqual(['primary', 'surface', 'text']);
    expect(sets.light.color['primary']?.$value).toMatchObject({
      components: [0, 0.478, 0.333],
      hex: '#007a55',
    });
    expect(sets.dark.color['text']?.$value.hex).toBe('#ffffff');
    expect(sets.light.color['primary']?.$extensions['com.zeroxsolutions.zaku']).toEqual({
      axis: 'system',
      source: '{palette.green}',
    });
    expect(sets.light.radius).toMatchObject({
      md: { $value: { value: 8, unit: 'px' } },
      lg: { $value: { value: 10, unit: 'px' } },
    });
    expect(doc.description).toBe('DTCG tokens: base.json, light.json (light); base.json, dark.json (dark)');
  });

  it('refuses a colour space it cannot convert, naming the token', () => {
    const flat = flattenTokens({
      color: {
        $type: 'color',
        wide: { $value: { colorSpace: 'display-p3', components: [1, 0, 0] } },
      },
    });
    expect(() =>
      dtcgTokenDocument(system({ light: ['a.json'], dark: ['a.json'] }), { light: flat, dark: flat }, 'acme'),
    ).toThrow('color.wide is in display-p3; zaku reads srgb, oklch or a hex');
  });
});
