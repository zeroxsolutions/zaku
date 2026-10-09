import { z } from 'zod';

export const rgbaSchema = z.object({ r: z.number(), g: z.number(), b: z.number(), a: z.number() }).strict();

export const libraryItemSchema = z
  .object({
    nodeId: z.string(),
    path: z.string(),
    type: z.string(),
    fill: rgbaSchema.nullable(),
    stroke: rgbaSchema.nullable(),
    textColor: rgbaSchema.nullable(),
    /**
     * An icon instance only: the colour its glyph is drawn in, which sits on the vectors inside it and not
     * on the instance's own frame. Absent on every other layer.
     */
    glyph: rgbaSchema.optional(),
    width: z.number(),
    height: z.number(),
    padding: z.tuple([z.number(), z.number(), z.number(), z.number()]).nullable(),
    gap: z.number().nullable(),
    radii: z.tuple([z.number(), z.number(), z.number(), z.number()]).nullable(),
    strokeWeights: z.tuple([z.number(), z.number(), z.number(), z.number()]).nullable(),
    fontSize: z.number().nullable(),
    fontFamily: z.string().nullable(),
    textStyleKey: z.string().nullable(),
    componentKey: z.string().nullable(),
    bindings: z.record(z.string(), z.string().nullable()),
  })
  .strict();

export const libraryVariantSchema = z
  .object({
    key: z.string(),
    name: z.string(),
    props: z.record(z.string(), z.string()),
    modes: z
      .array(z.object({ combo: z.record(z.string(), z.string()), items: z.array(libraryItemSchema) }).strict())
      .min(1),
  })
  .strict();

export const libraryComponentSchema = z
  .object({
    name: z.string(),
    key: z.string(),
    page: z.string(),
    codePath: z.string().nullable(),
    map: z
      .object({ props: z.record(z.string(), z.string()), parts: z.record(z.string(), z.string()) })
      .strict()
      .nullable(),
    variants: z.array(libraryVariantSchema).min(1),
  })
  .strict();

export const textStyleSchema = z
  .object({
    key: z.string(),
    name: z.string(),
    fontFamily: z.string(),
    fontStyle: z.string(),
    fontSize: z.number(),
  })
  .strict();

export const tokenSnapshotSchema = z
  .object({
    combo: z.record(z.string(), z.string()),
    values: z.record(z.string(), z.union([rgbaSchema, z.number(), z.string(), z.boolean()])),
  })
  .strict();

/** What one `use_figma` call of the export script returns. */
export const libraryPartSchema = z
  .object({
    exportedAt: z.string(),
    components: z.array(libraryComponentSchema),
    textStyles: z.array(textStyleSchema),
    tokens: z.array(tokenSnapshotSchema),
  })
  .strict();

/**
 * What the Plugin API export returns: every semantic token resolved per mode combination, colours as
 * `#rrggbbaa` to keep the reply under the tool's size cap, the id of every local variable a paint can
 * be bound to, and the text styles. Components are read over REST and joined to it.
 */
export const variablePartSchema = z
  .object({
    exportedAt: z.string(),
    variables: z.record(z.string(), z.string()),
    textStyles: z.array(textStyleSchema),
    tokens: z.array(
      z
        .object({
          combo: z.record(z.string(), z.string()),
          values: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
        })
        .strict(),
    ),
  })
  .strict();

/** `source` is the Figma file key the library was read from. */
export const librarySnapshotSchema = libraryPartSchema.extend({ source: z.string(), version: z.string() }).strict();

export type Rgba = z.output<typeof rgbaSchema>;
export type LibraryItem = z.output<typeof libraryItemSchema>;
export type LibraryVariant = z.output<typeof libraryVariantSchema>;
export type LibraryComponent = z.output<typeof libraryComponentSchema>;
export type LibraryPart = z.output<typeof libraryPartSchema>;
export type LibrarySnapshot = z.output<typeof librarySnapshotSchema>;
export type VariablePart = z.output<typeof variablePartSchema>;
