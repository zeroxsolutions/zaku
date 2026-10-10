import { z } from 'zod';
import type { ZakuConfig } from '../schema/zaku-config.js';
import type { LibrarySnapshot } from './library.js';
import type { LoadedMap } from '../repositories/feature-maps.js';
import type { ScreenOutline, Unmapped } from './outline.js';
import type { RecipeDocument } from './recipe.js';
import type { TokenDocument } from './token-document.js';

export const CHECK_IDS = [
  'schema',
  'reachability',
  'way-back',
  'coverage',
  'library',
  'overrides',
  'binding',
  'recipe',
  'font',
  'copy',
  'target-size',
  'overlap',
  'tokens',
  'contrast',
  'freshness',
  'images',
  'frame',
  'system-bars',
  'placement',
  'naming',
  'component',
  'prototype',
] as const;

export type CheckId = (typeof CHECK_IDS)[number];

/** One broken rule: the check that found it, what it says, and where. */
export const findingSchema = z
  .object({
    check: z.enum(CHECK_IDS).describe('The rule broken; read_guide with it explains the rule'),
    message: z.string(),
    feature: z.string().optional(),
    screen: z.string().optional(),
    frame: z.string().optional().describe('The top-level frame that holds the node'),
    nodeId: z.string().optional(),
    field: z.string().optional().describe('The property at fault, such as fill or paddingTop'),
  })
  .strict();

export type Finding = z.output<typeof findingSchema>;

export interface NotRun {
  check: CheckId;
  reason: string;
}

export interface CheckInput {
  config: ZakuConfig;
  maps: readonly LoadedMap[];
  outlines: readonly ScreenOutline[];
  unmapped: Unmapped['frames'];
  library: LibrarySnapshot | null;
  tokens: TokenDocument | null;
  recipe: RecipeDocument | null;
}

export type CheckOutcome = { findings: Finding[] } | { notRun: string };
export type Check = (input: CheckInput) => CheckOutcome;
