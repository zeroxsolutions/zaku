import { z } from 'zod';
import { CHECK_IDS } from '../domain/findings.js';

/** The one port the plugin's manifest admits; the server listens on it. */
export const BRIDGE_PORT = 7337;
export const PLUGIN_VERSION = '0.1.0';

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

const findingSchema = z
  .object({
    check: z.enum(CHECK_IDS),
    message: z.string(),
    feature: z.string().optional(),
    screen: z.string().optional(),
    frame: z.string().optional(),
    nodeId: z.string().optional(),
    field: z.string().optional(),
  })
  .strict();

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

/** A connection is attached only once its first message carries one of these. */
export const credentialSchema = z.union([
  z.object({ code: z.string().max(32) }).strict(),
  z.object({ token: z.string().max(128) }).strict(),
]);

export const helloSchema = fileHelloSchema.extend({ credential: credentialSchema }).strict();

/** Why the server refused a connection's credential; it closes the connection after saying so. */
export const REFUSAL_REASONS = ['wrong-code', 'expired-code', 'used-up-code', 'unknown-token'] as const;

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
    })
    .strict(),
  z
    .object({
      type: z.literal('settled'),
      runId: z.string(),
      outcome: z.enum(['committed', 'rolled-back']),
      /** Nodes that existed before the run and were changed; removing created nodes cannot undo them. */
      untouchable: z.array(z.string()),
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
  z.object({ type: z.literal('findings'), findings: z.array(findingSchema) }).strict(),
  z.object({ type: z.literal('select'), nodeId: z.string() }).strict(),
  /** The answer to a valid code: the token the plugin presents from then on. */
  z.object({ type: z.literal('paired'), token: z.string() }).strict(),
  z.object({ type: z.literal('refused'), reason: z.enum(REFUSAL_REASONS) }).strict(),
]);

export type NodeSnapshot = z.output<typeof nodeSnapshotSchema>;
export type FileHello = z.output<typeof fileHelloSchema>;
export type Credential = z.output<typeof credentialSchema>;
export type Hello = z.output<typeof helloSchema>;
export type RefusalReason = (typeof REFUSAL_REASONS)[number];
export type ReadTarget = z.output<typeof readTargetSchema>;
export type CheckScope = z.output<typeof checkScopeSchema>;
export type PluginMessage = z.output<typeof pluginMessageSchema>;
export type ServerMessage = z.output<typeof serverMessageSchema>;
