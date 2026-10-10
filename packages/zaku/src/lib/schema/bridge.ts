import { z } from 'zod';
import { findingSchema } from '../domain/findings.js';

/**
 * The ports the plugin's manifest admits, in the order zaku-mcp tries them. Figma admits a localhost port only
 * when the manifest lists it, so a port added here is added to `allowedDomains` too.
 */
export const BRIDGE_PORTS = [7337, 7338, 7339, 7340, 7341, 7342, 7343, 7344, 7345, 7346] as const;
/** The ports as a person reads them, `7337-7346`. */
export const BRIDGE_PORT_RANGE = `${BRIDGE_PORTS[0]}-${BRIDGE_PORTS[BRIDGE_PORTS.length - 1]}`;
export const PLUGIN_VERSION = '0.1.0';
/** The digits in a pairing code; the agent shows them as two groups of four. */
export const PAIRING_CODE_LENGTH = 8;

const SPACING_FIELDS = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'itemSpacing'] as const;

/** One solid paint; only a solid colour is a raw value a variable should carry. */
const paintSchema = z.object({ bound: z.boolean() }).strict();

/** What the rules read of one node the script created or changed. */
export const nodeSnapshotSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    parentId: z.string().nullable(),
    /** The name of the top-level frame on the page that holds the node, so a reader finds the screen; null off a page. */
    frame: z.string().nullable(),
    created: z.boolean(),
    fills: z.array(paintSchema),
    strokes: z.array(paintSchema),
    /** TEXT only: the style id, `mixed` across ranges, or null when unstyled. */
    textStyleId: z.string().nullable(),
    /** A TEXT outside every instance: what it shows. A text an instance holds is read from its override. */
    characters: z.string().optional(),
    instance: z
      .object({
        /** `picture` marks a layer that holds an image, whose fills override places content rather than restyling. */
        overrides: z.array(
          z
            .object({
              nodeId: z.string(),
              fields: z.array(z.string()),
              picture: z.boolean().optional(),
              /** On a `characters` override: what the layer now shows. */
              characters: z.string().optional(),
            })
            .strict(),
        ),
        /** What the component's text layers left as they are show: the library's own copy. */
        carried: z.array(z.string()).optional(),
        sizing: z.object({ horizontal: z.string(), vertical: z.string() }).strict(),
      })
      .strict()
      .nullable(),
    spacing: z.array(z.object({ field: z.enum(SPACING_FIELDS), value: z.number(), bound: z.boolean() }).strict()),
    /** The page that holds the node; null off a page. Absent from a plugin older than the field. */
    page: z.object({ id: z.string(), name: z.string() }).strict().nullable().optional(),
    /** Whether the node is a component or a component set, or sits inside one. */
    componentSource: z.boolean().optional(),
    /**
     * A frame, component, set, instance or text: its place in its parent, its size and how it sizes, and its auto
     * layout. The documentation rule reads it. Absent from a plugin older than the field.
     */
    box: z
      .object({
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number(),
        /** `layoutSizingHorizontal` and `layoutSizingVertical`: FIXED, HUG or FILL. */
        sizing: z.object({ horizontal: z.string(), vertical: z.string() }).strict(),
        /** NONE, HORIZONTAL, VERTICAL or GRID. */
        layout: z.string(),
        wrap: z.boolean(),
        /** Top, right, bottom, left. */
        padding: z.tuple([z.number(), z.number(), z.number(), z.number()]),
        /** The gap along the axis: `itemSpacing`, or a grid's column gap. */
        gap: z.number(),
        /** The gap across it: a wrapping row's `counterAxisSpacing`, or a grid's row gap. */
        crossGap: z.number(),
        /** `primaryAxisAlignItems`, then `counterAxisAlignItems`. */
        align: z.tuple([z.string(), z.string()]),
      })
      .strict()
      .optional(),
    /** TEXT only: the type it is set in; `mixed` where ranges differ. */
    font: z
      .object({
        size: z.union([z.number(), z.literal('mixed')]),
        /** In px; `auto` for Figma's automatic line height. */
        lineHeight: z.union([z.number(), z.literal('auto'), z.literal('mixed')]),
        /** The font's style name as the family spells it (`Semi Bold`, `SemiBold`). */
        style: z.string(),
      })
      .strict()
      .optional(),
    /** COMPONENT or COMPONENT_SET only: its component properties, by the name a designer reads. */
    properties: z
      .array(
        z
          .object({
            name: z.string(),
            type: z.string(),
            default: z.union([z.string(), z.boolean()]),
          })
          .strict(),
      )
      .optional(),
    /** INSTANCE only: the name of its component, the set's name for a variant. */
    main: z.string().nullable().optional(),
    /** COMPONENT_SET only: its size and each variant's box, relative to the set. */
    set: z
      .object({
        width: z.number(),
        height: z.number(),
        variants: z.array(
          z
            .object({
              id: z.string(),
              name: z.string(),
              x: z.number(),
              y: z.number(),
              width: z.number(),
              height: z.number(),
            })
            .strict(),
        ),
      })
      .strict()
      .optional(),
  })
  .strict();

export interface OutlineNode {
  id: string;
  name: string;
  type: string;
  width: number;
  height: number;
  layout: { mode: string; padding: [number, number, number, number]; gap: number } | null;
  /** Field to variable name. */
  bound: Record<string, string>;
  component: { name: string; variant: string | null } | null;
  text: string | null;
  /** Absent past the requested depth; empty when the node has none. */
  children?: OutlineNode[];
}

export const outlineNodeSchema: z.ZodType<OutlineNode> = z.lazy(() =>
  z
    .object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      width: z.number(),
      height: z.number(),
      layout: z
        .object({
          mode: z.string(),
          padding: z.tuple([z.number(), z.number(), z.number(), z.number()]),
          gap: z.number(),
        })
        .strict()
        .nullable(),
      bound: z.record(z.string(), z.string()),
      component: z.object({ name: z.string(), variant: z.string().nullable() }).strict().nullable(),
      text: z.string().nullable(),
      children: z.array(outlineNodeSchema).optional(),
    })
    .strict(),
);

export const readTargetSchema = z.union([
  z.object({ nodeId: z.string() }).strict(),
  /** Names from the page down, `Page/Frame/Layer`. */
  z.object({ path: z.string() }).strict(),
]);

export const checkScopeSchema = z.union([
  z.object({ page: z.literal(true) }).strict(),
  z.object({ nodeId: z.string() }).strict(),
  z.object({ all: z.literal(true) }).strict(),
]);

/** What the sandbox reports about its file; the panel adds the credential before it goes on the socket. */
export const fileHelloSchema = z
  .object({
    type: z.literal('hello'),
    file: z.string(),
    pages: z.array(z.object({ id: z.string(), name: z.string() }).strict()),
    currentPage: z.string(),
    selection: z.array(z.string()),
    pluginVersion: z.string(),
    user: z.string().nullable(),
  })
  .strict();

/** A connected file as get_bridge_state reports it: its hello, without the message type. */
export const sessionViewSchema = fileHelloSchema.omit({ type: true });

/** A connection is attached only once its first message carries one of these. */
export const credentialSchema = z.union([
  z.object({ code: z.string().max(32) }).strict(),
  z.object({ token: z.string().max(128) }).strict(),
]);

export const helloSchema = fileHelloSchema.extend({ credential: credentialSchema }).strict();

/** Why the server refused a connection's credential; it closes the connection after saying so. */
export const REFUSAL_REASONS = ['wrong-code', 'expired-code', 'used-up-code', 'unknown-token'] as const;

/**
 * What a screenshot may be. Figma's exportAsync documents no size limit of its own; these are the image a model
 * can read, per Claude's vision docs (https://platform.claude.com/docs/en/build-with-claude/vision, read
 * 2026-10-10). An image may be 10 MB of base64 on the Claude API and 5 MB on Amazon Bedrock and Google Cloud;
 * `maxBytes` of PNG stays under the 5 MB as base64, so a screenshot reads on all three. A request holding more
 * than 20 images refuses one whose side passes 2000 px, and a library run takes more than 20, so no side passes
 * `maxDimension`. A standard-tier model scales a long edge past 1568 px down, the default here; a
 * high-resolution one reads up to 2576 px, so a caller gains detail up to the 2000 cap.
 */
export const SCREENSHOT_LIMITS = {
  maxBytes: 3_750_000,
  minScale: 0.1,
  maxScale: 4,
  minDimension: 64,
  maxDimension: 2000,
  defaultDimension: 1568,
  /** A maxDimension never enlarges a node past this scale, so a small node does not come back blurred. */
  maxUpscale: 2,
} as const;

/** How large to render: a scale of the node's size, or the length its longer side is rendered at. */
export const screenshotSizeSchema = z.union([
  z.object({ scale: z.number().min(SCREENSHOT_LIMITS.minScale).max(SCREENSHOT_LIMITS.maxScale) }).strict(),
  z
    .object({
      maxDimension: z.number().int().min(SCREENSHOT_LIMITS.minDimension).max(SCREENSHOT_LIMITS.maxDimension),
    })
    .strict(),
]);

/** A node rendered as a PNG, as get_screenshot reports it beside the image. */
export const screenshotSchema = z
  .object({
    nodeId: z.string().describe('The node rendered'),
    name: z.string().describe("The node's name"),
    width: z.number().int().describe("The PNG's width in pixels"),
    height: z.number().int().describe("The PNG's height in pixels"),
    scale: z.number().describe("The PNG's pixels per unit of the node's size in Figma"),
  })
  .strict();

/** Why the sandbox rendered nothing: no such node, a node with no image (a page), too large, or Figma threw. */
export const EXPORT_REFUSALS = ['missing', 'not-exportable', 'too-large', 'failed'] as const;

export const pluginMessageSchema = z.discriminatedUnion('type', [
  helloSchema,
  /** The panel's Unpair: the server forgets the token this connection presented, and closes it. */
  z.object({ type: z.literal('unpair') }).strict(),
  /** The panel's Check again: the server checks the scope and pushes the findings back. */
  z.object({ type: z.literal('check'), scope: checkScopeSchema }).strict(),
  z.object({ type: z.literal('state'), currentPage: z.string(), selection: z.array(z.string()) }).strict(),
  z
    .object({
      type: z.literal('ran'),
      runId: z.string(),
      ok: z.literal(true),
      value: z.unknown(),
      created: z.array(z.string()),
      mutated: z.array(z.string()),
      snapshot: z.array(nodeSnapshotSchema),
    })
    .strict(),
  z
    .object({
      type: z.literal('threw'),
      runId: z.string(),
      error: z.string(),
      /** Nodes that existed before the run and were changed; removing created nodes cannot undo them. */
      untouchable: z.array(z.string()),
      /** Nodes the run made that the plugin could not remove: they are still in the file. */
      left: z.array(z.string()).default([]),
    })
    .strict(),
  z
    .object({
      type: z.literal('settled'),
      runId: z.string(),
      outcome: z.enum(['committed', 'rolled-back']),
      /** Nodes that existed before the run and were changed; removing created nodes cannot undo them. */
      untouchable: z.array(z.string()),
      /** Nodes the run made that the plugin could not remove: they are still in the file. */
      left: z.array(z.string()).default([]),
    })
    .strict(),
  z
    .object({
      type: z.literal('read-result'),
      requestId: z.string(),
      nodes: z.array(outlineNodeSchema).optional(),
      snapshot: z.array(nodeSnapshotSchema).optional(),
      error: z.string().optional(),
    })
    .strict(),
  /** A node rendered: its name, the PNG's size in pixels, the scale it was rendered at, and the PNG as base64. */
  z
    .object({
      type: z.literal('exported'),
      requestId: z.string(),
      name: z.string(),
      width: z.number().int(),
      height: z.number().int(),
      scale: z.number(),
      png: z.string(),
    })
    .strict(),
  /** Nothing rendered; a render too large names its size in pixels, and in bytes once it was encoded. */
  z
    .object({
      type: z.literal('export-refused'),
      requestId: z.string(),
      reason: z.enum(EXPORT_REFUSALS),
      bytes: z.number().int().optional(),
      width: z.number().int().optional(),
      height: z.number().int().optional(),
      error: z.string().optional(),
    })
    .strict(),
]);

export const serverMessageSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('run'),
      runId: z.string(),
      script: z.string(),
      timeoutMs: z.number().int().positive(),
      holdMs: z.number().int().positive(),
    })
    .strict(),
  z.object({ type: z.literal('decide'), runId: z.string(), decision: z.enum(['commit', 'rollback']) }).strict(),
  z
    .object({
      type: z.literal('read'),
      requestId: z.string(),
      target: readTargetSchema,
      depth: z.number().int().min(0),
    })
    .strict(),
  z.object({ type: z.literal('snapshot'), requestId: z.string(), scope: checkScopeSchema }).strict(),
  /** Render one node as a PNG no larger than `maxBytes`. */
  z
    .object({
      type: z.literal('export'),
      requestId: z.string(),
      nodeId: z.string(),
      size: screenshotSizeSchema,
      maxBytes: z.number().int().positive(),
    })
    .strict(),
  z.object({ type: z.literal('findings'), findings: z.array(findingSchema) }).strict(),
  z.object({ type: z.literal('select'), nodeId: z.string() }).strict(),
  /** The answer to a valid code: the token the plugin presents from then on. */
  z.object({ type: z.literal('paired'), token: z.string() }).strict(),
  z.object({ type: z.literal('refused'), reason: z.enum(REFUSAL_REASONS) }).strict(),
]);

export type NodeSnapshot = z.output<typeof nodeSnapshotSchema>;
export type FileHello = z.output<typeof fileHelloSchema>;
export type SessionView = z.output<typeof sessionViewSchema>;
export type Credential = z.output<typeof credentialSchema>;
export type Hello = z.output<typeof helloSchema>;
export type RefusalReason = (typeof REFUSAL_REASONS)[number];
export type ReadTarget = z.output<typeof readTargetSchema>;
export type CheckScope = z.output<typeof checkScopeSchema>;
export type PluginMessage = z.output<typeof pluginMessageSchema>;
export type ServerMessage = z.output<typeof serverMessageSchema>;
export type ScreenshotSize = z.output<typeof screenshotSizeSchema>;
export type ExportRefusal = (typeof EXPORT_REFUSALS)[number];
/** A rendered node, and its PNG as base64. */
export type Screenshot = z.output<typeof screenshotSchema> & { png: string };
