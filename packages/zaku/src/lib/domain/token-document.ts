import { z } from 'zod';
import { parseCssColour, toHex } from './colour.js';
import type { DecodedPreset } from '../adapters/shadcn-preset.js';

/** shadcn's preset axes, then `system` for every token of a design system that ships DTCG tokens. */
export const TOKEN_AXES = ['base-color', 'theme', 'chart', 'menu-accent', 'radius', 'project', 'system'] as const;
export type TokenAxis = (typeof TOKEN_AXES)[number];

const extensions = z
  .object({
    'com.zeroxsolutions.zaku': z.object({ axis: z.enum(TOKEN_AXES), source: z.string() }).strict(),
  })
  .strict();

export const colorTokenSchema = z
  .object({
    $type: z.literal('color'),
    $value: z
      .object({
        colorSpace: z.literal('srgb'),
        components: z.tuple([z.number(), z.number(), z.number()]),
        alpha: z.number(),
        hex: z.string().regex(/^#[0-9a-f]{6}$/),
      })
      .strict(),
    $extensions: extensions,
  })
  .strict();

export const dimensionTokenSchema = z
  .object({
    $type: z.literal('dimension'),
    $value: z.object({ value: z.number(), unit: z.literal('px') }).strict(),
    $extensions: extensions,
  })
  .strict();

export const tokenSetSchema = z
  .object({
    color: z.record(z.string(), colorTokenSchema),
    radius: z.record(z.string(), dimensionTokenSchema),
  })
  .strict();

export const tokenDocumentSchema = z
  .object({
    $schema: z.string(),
    version: z.literal('2025.10'),
    name: z.string(),
    description: z.string(),
    modifiers: z
      .object({
        scheme: z
          .object({
            contexts: z.object({ light: z.tuple([tokenSetSchema]), dark: z.tuple([tokenSetSchema]) }).strict(),
            default: z.literal('light'),
          })
          .strict(),
      })
      .strict(),
    resolutionOrder: z.tuple([z.object({ $ref: z.literal('#/modifiers/scheme') }).strict()]),
  })
  .strict();

export type ColorToken = z.output<typeof colorTokenSchema>;
export type TokenSet = z.output<typeof tokenSetSchema>;
export type TokenDocument = z.output<typeof tokenDocumentSchema>;

export function tokenSets(doc: TokenDocument): { light: TokenSet; dark: TokenSet } {
  return {
    light: doc.modifiers.scheme.contexts.light[0],
    dark: doc.modifiers.scheme.contexts.dark[0],
  };
}

const THEME_TOKENS = new Set(['primary', 'primary-foreground', 'sidebar-primary', 'sidebar-primary-foreground']);
const MENU_ACCENT_TOKENS = new Set(['accent', 'accent-foreground']);
/** Every custom property shadcn's preset generates; anything else is the product's own. */
const PRESET_TOKENS = new Set([
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'border',
  'input',
  'ring',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'sidebar',
  'sidebar-foreground',
  'sidebar-primary',
  'sidebar-primary-foreground',
  'sidebar-accent',
  'sidebar-accent-foreground',
  'sidebar-border',
  'sidebar-ring',
]);

/** shadcn's @theme multiplies --radius by these for each step. */
const RADIUS_STEPS: Record<string, number> = {
  sm: 0.6,
  md: 0.8,
  lg: 1,
  xl: 1.4,
  '2xl': 1.8,
  '3xl': 2.2,
  '4xl': 2.6,
};

export function axisOf(name: string): TokenAxis {
  if (!PRESET_TOKENS.has(name)) return 'project';
  if (THEME_TOKENS.has(name)) return 'theme';
  if (MENU_ACCENT_TOKENS.has(name)) return 'menu-accent';
  if (/^chart-\d$/.test(name)) return 'chart';
  return 'base-color';
}

export function buildTokenDocument(
  preset: DecodedPreset,
  theme: { light: Record<string, string>; dark: Record<string, string> },
): TokenDocument {
  const radiusSource = theme.light['radius'] ?? '';
  const radiusRem = /^([\d.]+)rem$/.exec(radiusSource)?.[1];
  if (radiusRem === undefined) throw new Error('the stylesheet declares no --radius in rem under :root');
  const radiusPx = Number(radiusRem) * 16;
  const radius: TokenSet['radius'] = Object.fromEntries(
    Object.entries(RADIUS_STEPS).map(([step, factor]) => [
      step,
      {
        $type: 'dimension' as const,
        $value: { value: Math.round(radiusPx * factor * 100) / 100, unit: 'px' as const },
        $extensions: {
          'com.zeroxsolutions.zaku': { axis: 'radius' as const, source: radiusSource },
        },
      },
    ]),
  );
  const set = (scheme: 'light' | 'dark'): TokenSet => {
    const color: TokenSet['color'] = {};
    for (const [name, lightValue] of Object.entries(theme.light)) {
      const source = scheme === 'dark' ? (theme.dark[name] ?? lightValue) : lightValue;
      const value = parseCssColour(source);
      if (!value) continue;
      color[name] = {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [value.r, value.g, value.b],
          alpha: value.a,
          hex: toHex(value),
        },
        $extensions: { 'com.zeroxsolutions.zaku': { axis: axisOf(name), source } },
      };
    }
    return { color, radius };
  };
  const described = Object.entries(preset.fields)
    .filter(([key]) => !['code', 'version', 'url'].includes(key))
    .map(([key, value]) => `${key} ${value}`)
    .join(', ');
  return tokenDocumentSchema.parse({
    $schema: 'https://www.designtokens.org/schemas/2025.10/resolver.json',
    version: '2025.10',
    name: preset.code,
    description: `shadcn preset ${preset.code}: ${described}`,
    modifiers: {
      scheme: { contexts: { light: [set('light')], dark: [set('dark')] }, default: 'light' },
    },
    resolutionOrder: [{ $ref: '#/modifiers/scheme' }],
  });
}
