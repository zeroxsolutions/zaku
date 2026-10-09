import { z } from 'zod';
import { featureMapSchema } from '../domain/feature-map.js';
import { zakuConfigSchema } from './zaku-config.js';

/** The JSON Schemas an editor reads to complete and check the hand-written design files. */
export function designJsonSchemas(): Record<string, unknown> {
  return {
    'zaku.schema.json': z.toJSONSchema(zakuConfigSchema, { io: 'input' }),
    'map.schema.json': z.toJSONSchema(featureMapSchema, { io: 'input' }),
  };
}
