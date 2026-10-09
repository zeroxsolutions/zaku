import { z } from 'zod';
import { rgbaSchema } from './library.js';

export const recipePartSchema = z
  .object({
    background: rgbaSchema.nullable(),
    color: rgbaSchema.nullable(),
    borderColor: rgbaSchema.nullable(),
    width: z.number(),
    height: z.number(),
    padding: z.tuple([z.number(), z.number(), z.number(), z.number()]),
    gap: z.number().nullable(),
    radii: z.tuple([z.number(), z.number(), z.number(), z.number()]).nullable(),
    borderWidths: z.tuple([z.number(), z.number(), z.number(), z.number()]),
    fontSize: z.number().nullable(),
    fontFamily: z.string().nullable(),
  })
  .strict();

/** What the code side computed for every variant of every component, in a browser; `zaku recipe` writes it. */
export const recipeDocumentSchema = z
  .object({
    components: z.array(
      z
        .object({
          name: z.string(),
          variants: z.array(
            z
              .object({
                props: z.record(z.string(), z.string()),
                scheme: z.enum(['light', 'dark']),
                parts: z.record(z.string(), recipePartSchema),
              })
              .strict(),
          ),
        })
        .strict(),
    ),
  })
  .strict();

export type RecipePart = z.output<typeof recipePartSchema>;
export type RecipeDocument = z.output<typeof recipeDocumentSchema>;
