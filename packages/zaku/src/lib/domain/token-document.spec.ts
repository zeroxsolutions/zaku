import { axisOf, buildTokenDocument, tokenDocumentSchema, tokenSets } from './token-document.js';

const color = (r: number, g: number, b: number, axis: string): Record<string, unknown> => ({
  $type: 'color',
  $value: { colorSpace: 'srgb', components: [r, g, b], alpha: 1, hex: '#000000' },
  $extensions: { 'com.zeroxsolutions.zaku': { axis, source: 'oklch(0 0 0)' } },
});

const set = { color: { primary: color(0, 0.4782, 0.3335, 'theme') }, radius: {} };

describe('tokenDocumentSchema', () => {
  it('accepts a resolver document with the scheme modifier and inline sets', () => {
    const doc = tokenDocumentSchema.parse({
      $schema: 'https://www.designtokens.org/schemas/2025.10/resolver.json',
      version: '2025.10',
      name: 'aCm3pr3s7',
      description: 'shadcn preset aCm3pr3s7',
      modifiers: { scheme: { contexts: { light: [set], dark: [set] }, default: 'light' } },
      resolutionOrder: [{ $ref: '#/modifiers/scheme' }],
    });
    expect(tokenSets(doc).light.color['primary']?.$value.components).toEqual([0, 0.4782, 0.3335]);
  });

  it('refuses an axis it does not know', () => {
    const bad = { color: { primary: color(0, 0, 0, 'brand') }, radius: {} };
    const result = tokenDocumentSchema.safeParse({
      $schema: 'x',
      version: '2025.10',
      name: 'x',
      description: 'x',
      modifiers: { scheme: { contexts: { light: [bad], dark: [bad] }, default: 'light' } },
      resolutionOrder: [{ $ref: '#/modifiers/scheme' }],
    });
    expect(result.success).toBe(false);
  });
});

describe('buildTokenDocument', () => {
  const preset = {
    code: 'aCm3pr3s7',
    fields: {
      code: 'aCm3pr3s7',
      version: 'b',
      style: 'nova',
      baseColor: 'zinc',
      theme: 'emerald',
      url: 'https://x',
    },
  };
  const theme = {
    light: {
      primary: 'oklch(0.508 0.118 165.612)',
      success: 'oklch(0.513 0.11 163.565)',
      'chart-1': 'oklch(0.827 0.119 306.383)',
      radius: '0.625rem',
    },
    dark: { primary: 'oklch(0.432 0.095 166.913)' },
  };

  it('writes each colour in sRGB with its oklch source and axis, in both schemes', () => {
    const doc = buildTokenDocument(preset, theme);
    const { light, dark } = tokenSets(doc);
    expect(light.color['primary']?.$value.hex).toBe('#007a55');
    expect(light.color['primary']?.$extensions['com.zeroxsolutions.zaku']).toEqual({
      axis: 'theme',
      source: 'oklch(0.508 0.118 165.612)',
    });
    expect(dark.color['primary']?.$value.hex).toBe('#006045');
    expect(doc.description).toBe('shadcn preset aCm3pr3s7: style nova, baseColor zinc, theme emerald');
  });

  it('gives a token missing from .dark its light value in Dark', () => {
    const { light, dark } = tokenSets(buildTokenDocument(preset, theme));
    expect(dark.color['success']?.$value.hex).toBe(light.color['success']?.$value.hex);
  });

  it('derives the radius steps from --radius the way shadcn multiplies it', () => {
    const radius = tokenSets(buildTokenDocument(preset, theme)).light.radius;
    expect(Object.fromEntries(Object.entries(radius).map(([step, token]) => [step, token.$value.value]))).toEqual({
      sm: 6,
      md: 8,
      lg: 10,
      xl: 14,
      '2xl': 18,
      '3xl': 22,
      '4xl': 26,
    });
  });

  it('puts the tokens a preset does not generate on the project axis', () => {
    expect(axisOf('success')).toBe('project');
    expect(axisOf('chart-3')).toBe('chart');
    expect(axisOf('accent')).toBe('menu-accent');
    expect(axisOf('border')).toBe('base-color');
  });
});
