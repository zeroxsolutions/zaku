import { z } from 'zod';

export const boundsSchema = z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() }).strict();

export const instanceOutlineSchema = z
  .object({
    nodeId: z.string(),
    component: z.string(),
    componentKey: z.string(),
    variant: z.string(),
    properties: z.record(z.string(), z.union([z.string(), z.boolean()])),
    swaps: z.array(z.string()),
    overrides: z.array(z.object({ nodeId: z.string(), fields: z.array(z.string()) }).strict()),
    /** Every instance inside, so a control a component wraps is sized and placed like a top-level one. */
    nested: z.array(
      z
        .object({
          nodeId: z.string(),
          path: z.string(),
          componentKey: z.string(),
          component: z.string(),
          interactive: z.boolean(),
          bounds: z.lazy(() => boundsSchema).nullable(),
        })
        .strict(),
    ),
    texts: z.array(z.object({ nodeId: z.string(), path: z.string(), characters: z.string() }).strict()),
    interactive: z.boolean(),
    /** A product's own component rather than one the library publishes. */
    local: z.boolean(),
    bounds: boundsSchema.nullable(),
    sizing: z.object({ horizontal: z.string(), vertical: z.string() }).strict(),
  })
  .strict();

export const textOutlineSchema = z
  .object({ nodeId: z.string(), characters: z.string(), styleKey: z.string().nullable() })
  .strict();

/** A layer outside every instance. `signature` is its subtree's shape (types and child counts), so a block drawn twice as plain layers shows. */
export const rawOutlineSchema = z
  .object({
    nodeId: z.string(),
    name: z.string(),
    type: z.string(),
    reason: z.string(),
    signature: z.string(),
  })
  .strict();

/** A layer named for a picture, or holding one: `filled` is whether it holds the image. */
export const imageOutlineSchema = z.object({ nodeId: z.string(), name: z.string(), filled: z.boolean() }).strict();

export const linkOutlineSchema = z
  .object({
    nodeId: z.string(),
    to: z.union([z.literal('back'), z.object({ nodeId: z.string() }).strict()]),
  })
  .strict();

export const frameOutlineSchema = z
  .object({
    nodeId: z.string(),
    name: z.string(),
    target: z.string(),
    state: z.string(),
    size: z.object({ width: z.number(), height: z.number() }).strict(),
    /** The names of what encloses the frame on its page, outermost first: the screen's group, then the state's. */
    containers: z.array(z.string()),
    start: z.boolean(),
    instances: z.array(instanceOutlineSchema),
    texts: z.array(textOutlineSchema),
    raw: z.array(rawOutlineSchema),
    images: z.array(imageOutlineSchema),
    defaultNames: z.array(z.object({ nodeId: z.string(), name: z.string() }).strict()),
    links: z.array(linkOutlineSchema),
  })
  .strict();

export const screenOutlineSchema = z
  .object({
    feature: z.string(),
    screen: z.string(),
    /** The Figma file key the frames were read from. */
    source: z.string(),
    fileVersion: z.string(),
    mapDigest: z.string(),
    libraryVersion: z.string().nullable(),
    frames: z.array(frameOutlineSchema),
  })
  .strict();

export const unmappedSchema = z
  .object({
    fileVersion: z.string(),
    frames: z.array(z.object({ nodeId: z.string(), name: z.string() }).strict()),
  })
  .strict();

export type Bounds = z.output<typeof boundsSchema>;
export type InstanceOutline = z.output<typeof instanceOutlineSchema>;
export type TextOutline = z.output<typeof textOutlineSchema>;
export type RawOutline = z.output<typeof rawOutlineSchema>;
export type ImageOutline = z.output<typeof imageOutlineSchema>;
export type LinkOutline = z.output<typeof linkOutlineSchema>;
export type FrameOutline = z.output<typeof frameOutlineSchema>;
export type ScreenOutline = z.output<typeof screenOutlineSchema>;
export type Unmapped = z.output<typeof unmappedSchema>;
