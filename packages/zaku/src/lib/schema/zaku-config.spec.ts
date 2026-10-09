import { zakuConfigSchema, DEFAULT_INTERACTIVE } from './zaku-config.js';

const toolless = {
  product: 'acme',
  designSystem: { shadcn: { preset: 'aCm3pr3s7' } },
  targets: [{ id: 'web-desktop', family: 'web', name: 'Desktop' }],
};

const minimal = { ...toolless, figma: { library: 'LIBKEY', product: 'PRODKEY' } };

describe('zakuConfigSchema', () => {
  it('fills the budget, the modes and the interactive list when they are left out', () => {
    const config = zakuConfigSchema.parse(minimal);
    expect(config.budget).toEqual({ mcpPerDay: 200, mcpPerRun: 30, reserve: 0.2 });
    expect(config.modes).toEqual({});
    expect(config.interactive).toEqual([...DEFAULT_INTERACTIVE]);
  });

  it('reads the recipe page, the dark class by default', () => {
    const config = zakuConfigSchema.parse({
      ...minimal,
      recipe: { url: 'http://localhost:4200/zaku/recipe' },
    });
    expect(config.recipe).toEqual({
      url: 'http://localhost:4200/zaku/recipe',
      dark: 'class',
      darkClass: 'dark',
    });
    expect(zakuConfigSchema.parse(minimal).recipe).toBeUndefined();
    expect(zakuConfigSchema.safeParse({ ...minimal, recipe: { url: 'localhost' } }).success).toBe(false);
    expect(zakuConfigSchema.safeParse({ ...minimal, recipe: { dark: 'system' } }).success).toBe(false);
  });

  it('refuses two targets with the same name, at the second one', () => {
    const result = zakuConfigSchema.safeParse({
      ...minimal,
      targets: [
        { id: 'web-desktop', family: 'web', name: 'Desktop' },
        { id: 'ios-phone', family: 'ios', name: 'Desktop' },
      ],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['targets', 1, 'name']);
  });

  it('refuses a target name with a slash, which would break a frame name apart', () => {
    const result = zakuConfigSchema.safeParse({
      ...minimal,
      targets: [{ id: 'web-desktop', family: 'web', name: 'Web / Desktop' }],
    });
    expect(result.success).toBe(false);
  });

  it('refuses a copy locale that is not a language tag, and a currency that is not ISO 4217', () => {
    expect(
      zakuConfigSchema.safeParse({ ...minimal, copy: { locales: ['en', 'vi'], currencies: ['VND'] } }).success,
    ).toBe(true);
    const result = zakuConfigSchema.safeParse({ ...minimal, copy: { locales: ['english'], currencies: ['DONG'] } });
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([
      ['copy', 'locales', 0],
      ['copy', 'currencies', 0],
    ]);
  });

  it('refuses a key it does not know', () => {
    expect(zakuConfigSchema.safeParse({ ...minimal, theme: 'dark' }).success).toBe(false);
  });

  it('refuses a family whose guideline it carries no rules for', () => {
    const result = zakuConfigSchema.safeParse({
      ...minimal,
      targets: [{ id: 'tv', family: 'tvos', name: 'TV' }],
    });
    expect(result.success).toBe(false);
  });

  it('refuses a config with no Figma files', () => {
    expect(zakuConfigSchema.safeParse(toolless).success).toBe(false);
  });

  it('takes a design system that ships DTCG tokens, by a resolver or by files per scheme', () => {
    const resolver = zakuConfigSchema.parse({
      ...minimal,
      designSystem: {
        dtcg: {
          resolver: 'tokens/resolver.json',
          light: { theme: 'light' },
          dark: { theme: 'dark' },
          contrast: [['color.text', 'color.surface']],
        },
      },
    });
    expect(resolver.designSystem).toEqual({
      dtcg: {
        resolver: 'tokens/resolver.json',
        light: { theme: 'light' },
        dark: { theme: 'dark' },
        colors: 'color',
        radii: 'radius',
        contrast: [['color.text', 'color.surface']],
      },
    });
    const files = zakuConfigSchema.parse({
      ...minimal,
      designSystem: {
        dtcg: {
          light: ['tokens/base.json', 'tokens/light.json'],
          dark: ['tokens/base.json', 'tokens/dark.json'],
        },
      },
    });
    expect(files.designSystem).toMatchObject({
      dtcg: { light: ['tokens/base.json', 'tokens/light.json'], contrast: [] },
    });
  });

  it('refuses a design system that is neither or both, and DTCG inputs that do not match a resolver', () => {
    expect(zakuConfigSchema.safeParse({ ...minimal, designSystem: {} }).success).toBe(false);
    expect(
      zakuConfigSchema.safeParse({
        ...minimal,
        designSystem: { shadcn: { preset: 'x' }, dtcg: { light: ['a.json'], dark: ['b.json'] } },
      }).success,
    ).toBe(false);
    expect(
      zakuConfigSchema.safeParse({
        ...minimal,
        designSystem: { dtcg: { light: { theme: 'light' }, dark: { theme: 'dark' } } },
      }).success,
    ).toBe(false);
    expect(
      zakuConfigSchema.safeParse({
        ...minimal,
        designSystem: { dtcg: { resolver: 'r.json', light: ['a.json'], dark: ['b.json'] } },
      }).success,
    ).toBe(false);
  });
});
