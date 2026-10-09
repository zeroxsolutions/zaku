import { z } from 'zod';

export const PLATFORM_FAMILIES = ['web', 'ios', 'android'] as const;
export type PlatformFamily = (typeof PLATFORM_FAMILIES)[number];

/** Library component set names whose instances a person taps or clicks. */
export const DEFAULT_INTERACTIVE = [
  'Button',
  'Button Group',
  'Checkbox',
  'Combobox',
  'Dropdown Menu',
  'Input',
  'Input Group',
  'Input OTP',
  'Native Select',
  'Pagination',
  'Radio Group',
  'Select',
  'Slider',
  'Switch',
  'Tabs',
  'Textarea',
  'Toggle',
  'Toggle Group',
] as const;

const id = z.string().regex(/^[a-z][a-z0-9-]*$/, 'lowercase letters, digits and dashes, starting with a letter');

export const targetSchema = z
  .object({
    id,
    family: z.enum(PLATFORM_FAMILIES),
    name: z
      .string()
      .regex(/^\S(.*\S)?$/, 'a name has no leading or trailing space')
      .refine((name) => !name.includes('/'), 'a name has no slash, which separates the parts of a frame name'),
    /** The frame size every frame of this target is drawn at; the frame check compares it. */
    size: z.object({ width: z.number().positive(), height: z.number().positive() }).strict().optional(),
  })
  .strict();

/**
 * The instances a native frame holds for its platform's system bars: one entry per bar, each the
 * component names that may stand for it.
 */
export const DEFAULT_SYSTEM_BARS: Record<PlatformFamily, string[][]> = {
  web: [],
  ios: [['Status Bar'], ['Home Indicator']],
  android: [['Status Bar'], ['Navigation Bar', 'Gesture Handle']],
};

/** Every component name that draws a system bar, on any platform the config knows. */
export function systemBarNames(config: Pick<ZakuConfig, 'systemBars'>): Set<string> {
  const bars = { ...DEFAULT_SYSTEM_BARS, ...config.systemBars };
  return new Set(Object.values(bars).flat(2));
}

export const budgetSchema = z
  .object({
    mcpPerDay: z.number().int().positive().default(200),
    mcpPerRun: z.number().int().positive().default(30),
    reserve: z.number().min(0).max(1).default(0.2),
  })
  .strict();

const files = z.object({ library: z.string().min(1), product: z.string().min(1) }).strict();

const shadcnSystem = z.object({ preset: z.string().min(1) }).strict();

const tokenFiles = z.array(z.string().min(1)).min(1);
const resolverInputs = z.record(z.string(), z.string());

/**
 * A design system that ships its tokens as DTCG 2025.10: a resolver document with the modifier
 * contexts that make Light and Dark, or the token files each scheme merges, in order.
 */
const dtcgSystem = z
  .object({
    resolver: z.string().min(1).optional(),
    light: z.union([tokenFiles, resolverInputs]),
    dark: z.union([tokenFiles, resolverInputs]),
    /** The group whose tokens are the colour roles, and the one whose tokens are the radius steps. */
    colors: z.string().min(1).default('color'),
    radii: z.string().min(1).default('radius'),
    /** Foreground and background token pairs a text is read in, each needing 4.5:1. */
    contrast: z.array(z.tuple([z.string().min(1), z.string().min(1)])).default([]),
  })
  .strict()
  .superRefine((dtcg, ctx) => {
    for (const scheme of ['light', 'dark'] as const) {
      const files = Array.isArray(dtcg[scheme]);
      if (dtcg.resolver !== undefined && files) {
        ctx.addIssue({
          code: 'custom',
          path: [scheme],
          message: 'with a resolver, name the modifier contexts, not files',
        });
      }
      if (dtcg.resolver === undefined && !files) {
        ctx.addIssue({
          code: 'custom',
          path: [scheme],
          message: 'without a resolver, list the token files',
        });
      }
    }
  });

/** The design system the code uses: exactly one of its kinds. */
export const designSystemSchema = z.union([
  z.object({ shadcn: shadcnSystem }).strict(),
  z.object({ dtcg: dtcgSystem }).strict(),
]);

/**
 * The product's recipe page: a route its development server mounts that renders every variant, marked
 * for `zaku recipe`. Dark is a class on the root element, or the colour-scheme media query.
 */
const recipeSchema = z
  .object({
    url: z.url().optional(),
    dark: z.enum(['class', 'media']).default('class'),
    darkClass: z.string().min(1).default('dark'),
  })
  .strict();

/** Whether a tag names a language whose script the locale data knows, which is what the copy check reads. */
function writtenInAScript(tag: string): boolean {
  try {
    return new Intl.Locale(tag).maximize().script !== undefined;
  } catch {
    return false;
  }
}

/**
 * The languages screens are written in and the currencies a price is shown in: their letters and their
 * symbols are what authored copy may hold beside printable ASCII.
 */
export const copySchema = z
  .object({
    locales: z
      .array(z.string().refine(writtenInAScript, 'a BCP 47 language tag, such as en or vi'))
      .min(1)
      .default(['en']),
    currencies: z
      .array(
        z
          .string()
          .refine((code) => Intl.supportedValuesOf('currency').includes(code), 'an ISO 4217 code, such as VND or USD'),
      )
      .default([]),
  })
  .strict();

/** The copy section a zaku.yaml without one reads as. */
export const DEFAULT_COPY: z.output<typeof copySchema> = { locales: ['en'], currencies: [] };

export const zakuConfigSchema = z
  .object({
    product: z.string().min(1),
    designSystem: designSystemSchema,
    figma: files,
    targets: z.array(targetSchema).min(1),
    modes: z.record(z.string(), z.string()).default({}),
    interactive: z.array(z.string().min(1)).default([...DEFAULT_INTERACTIVE]),
    systemBars: z.record(z.enum(PLATFORM_FAMILIES), z.array(z.array(z.string().min(1)).min(1))).optional(),
    budget: budgetSchema.default({ mcpPerDay: 200, mcpPerRun: 30, reserve: 0.2 }),
    recipe: recipeSchema.optional(),
    copy: copySchema.default(DEFAULT_COPY),
  })
  .strict()
  .superRefine((config, ctx) => {
    for (const key of ['id', 'name'] as const) {
      const seen = new Set<string>();
      config.targets.forEach((target, index) => {
        if (seen.has(target[key])) {
          ctx.addIssue({
            code: 'custom',
            path: ['targets', index, key],
            message: `a second target with ${key} ${target[key]}`,
          });
        }
        seen.add(target[key]);
      });
    }
  });

export type ZakuConfig = z.output<typeof zakuConfigSchema>;
export type Target = ZakuConfig['targets'][number];
export type Budget = ZakuConfig['budget'];
export type CopyConfig = ZakuConfig['copy'];
export type DesignSystem = ZakuConfig['designSystem'];
export type DtcgSystem = Extract<DesignSystem, { dtcg: unknown }>['dtcg'];
