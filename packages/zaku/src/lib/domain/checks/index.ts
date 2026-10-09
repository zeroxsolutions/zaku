import type { Check, CheckId } from '../findings.js';
import { binding } from './binding.js';
import { copy } from './copy.js';
import { coverage } from './coverage.js';
import { component, frameCheck, images, naming, placement, systemBars } from './drawing.js';
import { font } from './font.js';
import { freshness } from './freshness.js';
import { libraryCheck } from './library.js';
import { reachability, wayBack } from './navigation.js';
import { overrides } from './overrides.js';
import { prototype } from './prototype.js';
import { recipe } from './recipe.js';
import { overlap, targetSize } from './size.js';
import { contrast, tokensCheck } from './tokens.js';

export const ALL_CHECKS: Partial<Record<CheckId, Check>> = {
  reachability,
  'way-back': wayBack,
  coverage,
  library: libraryCheck,
  overrides,
  binding,
  recipe,
  font,
  copy,
  'target-size': targetSize,
  overlap,
  tokens: tokensCheck,
  contrast,
  freshness,
  images,
  frame: frameCheck,
  'system-bars': systemBars,
  placement,
  naming,
  component,
  prototype,
};
