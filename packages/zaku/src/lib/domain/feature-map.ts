import { z } from 'zod';
import type { Target, ZakuConfig } from '../schema/zaku-config.js';

const slug = z.string().regex(/^[a-z][a-z0-9-]*$/, 'lowercase letters, digits and dashes, starting with a letter');
const screenRef = z.string().regex(/^([a-z][a-z0-9-]*\/)?[a-z][a-z0-9-]*$/, 'a screen id, or <feature>/<screen id>');
const state = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9 ,-]*$/, 'letters, digits, spaces, commas and dashes')
  .refine((text) => !text.includes('/'), 'a state has no slash, which separates the parts of a frame name');

export const DEFAULT_STATE = 'Default';

export const screenSchema = z
  .object({
    title: z
      .string()
      .min(1)
      .refine((text) => !text.includes('/'), 'a title has no slash, which separates the parts of a frame name'),
    root: z.boolean().default(false),
    states: z
      .array(state)
      .min(1)
      .refine((states) => states[0] === DEFAULT_STATE, `the first state is ${DEFAULT_STATE}`),
    targets: z.union([z.literal('all'), z.array(slug).min(1)]).default('all'),
    omits: z.record(z.string(), z.string().min(1)).default({}),
    'copy-varies': z.string().min(1).optional(),
    entry: z
      .array(
        z
          .object({
            from: screenRef.optional(),
            url: z.string().min(1).optional(),
            via: z.string().min(1).optional(),
          })
          .strict()
          .refine((entry) => entry.from !== undefined || entry.url !== undefined, 'an entry names a from or a url'),
      )
      .default([]),
    exits: z.array(z.object({ to: screenRef, via: z.string().min(1) }).strict()).default([]),
    back: z
      .object({
        web: z.string(),
        ios: z.string(),
        android: z.string(),
        macos: z.string(),
        windows: z.string(),
        gnome: z.string(),
        kde: z.string(),
      })
      .partial()
      .strict()
      .default({}),
    components: z.array(z.string().min(1)).default([]),
    a11y: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

export const featureMapSchema = z.object({ feature: slug, screens: z.record(slug, screenSchema) }).strict();

export type FeatureMap = z.output<typeof featureMapSchema>;
export type Screen = z.output<typeof screenSchema>;

export function resolveTargets(screen: Screen, config: ZakuConfig): { targets: Target[]; unknown: string[] } {
  const known = new Map(config.targets.map((target) => [target.id, target]));
  const named = screen.targets === 'all' ? config.targets.map((target) => target.id) : screen.targets;
  const unknown = [...named, ...Object.keys(screen.omits)].filter((id) => !known.has(id));
  const targets = named
    .filter((id) => !(id in screen.omits))
    .map((id) => known.get(id))
    .filter((target): target is Target => target !== undefined);
  return { targets, unknown };
}

export const FRAME_NAME_SEPARATOR = ' / ';

export function frameName(target: Target, screen: Pick<Screen, 'title'>, frameState: string): string {
  return [screen.title, frameState, target.name].join(FRAME_NAME_SEPARATOR);
}

export interface ParsedFrameName {
  target: Target;
  title: string;
  state: string;
}

export function parseFrameName(name: string, targets: readonly Target[]): ParsedFrameName | null {
  const parts = name.split(FRAME_NAME_SEPARATOR);
  if (parts.length < 3) return null;
  const target = targets.find((candidate) => candidate.name === parts[parts.length - 1]);
  if (!target) return null;
  return {
    target,
    title: parts.slice(0, -2).join(FRAME_NAME_SEPARATOR),
    state: parts[parts.length - 2]!,
  };
}

export function qualify(ref: string, feature: string): string {
  return ref.includes('/') ? ref : `${feature}/${ref}`;
}
