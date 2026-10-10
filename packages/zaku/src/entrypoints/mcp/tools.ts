import type { MessageBus } from '@zeroxsolutions/cosmic';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { FigmaBridge } from '../../lib/adapters/figma-bridge.js';
import { ExecuteScript } from '../../lib/commands/index.js';
import { findingSchema } from '../../lib/domain/findings.js';
import { CODE_LIFETIME_MS, displayCode } from '../../lib/domain/pairing-codes.js';
import { UnknownTopic } from '../../lib/domain/errors/index.js';
import { lostRunSchema, settledRunSchema, type ExecuteResult } from '../../lib/handlers/index.js';
import type { IDesignConfigRepository } from '../../lib/repositories/design-config-repository.js';
import type { IGuideRepository } from '../../lib/repositories/guide-repository.js';
import { pairingSchema } from '../../lib/repositories/pairing-store.js';
import {
  outlineNodeSchema,
  SCREENSHOT_LIMITS,
  screenshotSchema,
  sessionViewSchema,
  type ScreenshotSize,
} from '../../lib/schema/bridge.js';
import { runCheck } from './check.js';
import { refusalText } from './error-map.js';
import { codeReportSchema, type Pairings } from './pairings.js';

export interface ToolSeams {
  bus: MessageBus;
  bridge: FigmaBridge;
  guides: IGuideRepository;
  pairings: Pairings;
  config: IDesignConfigRepository;
  designRoot: string;
  listening: () => { port: number | null; portError: string | null };
  /** How long a script may run before the bridge rolls it back, as execute's description states it. */
  runTimeoutMs: number;
}

/** A tool's answer, as the structured content its output schema declares. */
type Body = Record<string, unknown>;

/** The structured content, and the same JSON as text for a client that reads only the text. */
const ok = (body: Body): CallToolResult => ({
  content: [{ type: 'text', text: JSON.stringify(body, null, 2) }],
  structuredContent: body,
});
/**
 * A refusal carries text alone: the MCP spec's tool execution error has no structured content, and the SDK
 * checks no error result against the output schema.
 */
const refused = (text: string): CallToolResult => ({
  content: [{ type: 'text', text: JSON.stringify({ error: text }) }],
  isError: true,
});

/** Runs a tool body; a domain refusal becomes an error result, anything else is rethrown for the SDK to report. */
async function answerWith(body: () => Promise<Body>, portError: string | null): Promise<CallToolResult> {
  try {
    return ok(await body());
  } catch (error) {
    const text = refusalText(error, portError);
    if (text === null) throw error;
    return refused(text);
  }
}

const file = z
  .string()
  .optional()
  .describe("A connected file's name from get_state; needed only when more than one is open");
const port = z
  .number()
  .int()
  .nullable()
  .describe('The port zaku-mcp listens on for the plugin; null while every port is taken');
const expiresAt = z.string().describe('When the code stops working, ISO 8601');
const findings = z.array(findingSchema).describe('What broke a rule; the plugin shows the same list');
const configSchema = z
  .object({ loaded: z.boolean(), error: z.string().optional().describe('Why zaku.yaml did not load') })
  .strict()
  .describe('Whether zaku.yaml loaded from the design directory');

/**
 * What each tool answers. The SDK lists an output schema only when its root is an object, so execute's two
 * outcomes share one object: on `unknown`, every field but `outcome` and `message` is absent.
 */
const OUTPUTS = {
  get_state: {
    files: z.array(sessionViewSchema).describe('The files with the zaku plugin open and paired'),
    port,
    portError: z.string().nullable().describe('Why zaku-mcp is not listening; null while it is'),
    pairing: codeReportSchema,
    designRoot: z.string().describe("The design directory whose zaku.yaml execute's copy rules read"),
    config: configSchema,
  },
  read_guide: {
    topic: z.string().describe('The topic asked for'),
    text: z.string().describe('The guide, as markdown'),
  },
  read: { nodes: z.array(outlineNodeSchema).describe('The nodes found, each with its children to the depth asked') },
  execute: settledRunSchema.partial().extend({
    outcome: z
      .enum([...settledRunSchema.shape.outcome.options, lostRunSchema.shape.outcome.value])
      .describe(
        'committed keeps the change; rolled-back undid it; partly-rolled-back left nodes; unknown: read before retrying',
      ),
  }).shape,
  check: { checked: z.number().int().describe('How many nodes the rules read'), findings },
  pair: {
    code: z
      .string()
      .optional()
      .describe('The code to show the user, two groups of four digits; absent when a dialog showed it'),
    shown: z.string().optional().describe('Set instead of code when the user saw the code in a dialog'),
    expiresAt,
    port,
    next: z.string().describe('What to tell the user to do with the code'),
  },
  pairings: { pairings: z.array(pairingSchema).describe('Every stored pairing'), code: codeReportSchema },
  unpair: { revoked: z.number().int().describe('How many pairings were revoked') },
  get_screenshot: screenshotSchema.shape,
} satisfies Record<string, z.ZodRawShape>;

/**
 * What each tool may do to the file and the pairings, for a host deciding what to ask the user. None reaches past
 * this machine: the plugin, the pairings file and the skills are all local.
 */
const reads = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;
const ANNOTATIONS = {
  get_state: reads,
  read_guide: reads,
  read: reads,
  get_screenshot: reads,
  pairings: reads,
  // It removes and changes nodes, and two runs of one script draw twice.
  execute: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  // It replaces the findings the panel shows, and nothing else.
  check: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  // A new code ends the one before it.
  pair: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  unpair: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
} satisfies Record<keyof typeof OUTPUTS, Record<string, boolean>>;

/** A rendered node's structured content, the same JSON as text, and the PNG as an image block. */
const pictured = ({ png, ...body }: { png: string } & Body): CallToolResult => ({
  content: [
    { type: 'text', text: JSON.stringify(body, null, 2) },
    { type: 'image', data: png, mimeType: 'image/png' },
  ],
  structuredContent: body,
});

export function registerTools(server: McpServer, seams: ToolSeams): void {
  const answer = (body: () => Promise<Body>): Promise<CallToolResult> => answerWith(body, seams.listening().portError);

  server.registerTool(
    'get_state',
    {
      title: 'Get zaku state',
      annotations: ANNOTATIONS.get_state,
      description: 'The connected Figma files, the bridge port, the pairing code state and whether zaku.yaml loaded',
      inputSchema: {},
      outputSchema: OUTPUTS.get_state,
    },
    () =>
      answer(async () => {
        let config: z.output<typeof configSchema>;
        try {
          config = { loaded: (await seams.config.readOptional(seams.designRoot)) !== null };
        } catch (error) {
          config = { loaded: false, error: error instanceof Error ? error.message : String(error) };
        }
        return {
          files: seams.bridge.sessions(),
          ...seams.listening(),
          pairing: seams.pairings.codeReport(),
          designRoot: seams.designRoot,
          config,
        };
      }),
  );

  server.registerTool(
    'read_guide',
    {
      title: 'Read a zaku guide',
      annotations: ANNOTATIONS.read_guide,
      description: "A zaku skill's or rule's guide as markdown; an unknown topic's error lists every topic",
      inputSchema: {
        topic: z.string().describe('A skill name, such as drawing-a-screen, or a rule id, such as binding'),
      },
      outputSchema: OUTPUTS.read_guide,
    },
    ({ topic }) =>
      answer(async () => {
        const text = await seams.guides.read(topic);
        if (text === null) throw new UnknownTopic(topic, await seams.guides.topics());
        return { topic, text };
      }),
  );

  server.registerTool(
    'read',
    {
      title: 'Read a Figma node',
      annotations: ANNOTATIONS.read,
      description:
        "An outline of a node subtree: each node's type, name, size, layout, bound variables, component and text",
      inputSchema: {
        file,
        nodeId: z.string().optional().describe('The node to read, such as 1:23; taken over path'),
        path: z.string().optional().describe('Names from the page down, Page/Frame/Layer; read when nodeId is absent'),
        depth: z.number().int().min(0).max(6).default(2).describe('Levels of children to include, 0 to 6'),
      },
      outputSchema: OUTPUTS.read,
    },
    ({ file: name, nodeId, path, depth }) =>
      answer(async () => {
        const session = seams.bridge.session(name);
        const target = nodeId ? { nodeId } : { path: path ?? '' };
        return { nodes: await seams.bridge.read(session, target, depth) };
      }),
  );

  server.registerTool(
    'execute',
    {
      title: 'Execute a Figma script',
      annotations: ANNOTATIONS.execute,
      description:
        'Run a Figma plugin script in an open file, check what it touched, and return the outcome and findings',
      inputSchema: {
        file,
        script: z
          .string()
          .describe(
            [
              'Plugin API code, run as an async function body; return a JSON value.',
              `A script has ${seams.runTimeoutMs / 1000} s: past that it is given up and what it made is removed, so draw one part per script.`,
              'Helpers are written into each script that uses them; code built from a string (new Function, eval, a function constructor) is refused.',
              'In a file the plugin reads page by page, set a style id with its async setter (setTextStyleIdAsync).',
            ].join(' '),
          ),
        mode: z
          .enum(['strict', 'report'])
          .default('strict')
          .describe('strict rolls the change back on any finding; report keeps it and returns the findings'),
      },
      outputSchema: OUTPUTS.execute,
    },
    ({ file: name, script, mode }) =>
      answer(
        async () =>
          (await seams.bus.send(
            new ExecuteScript({ file: name, script, mode, designRoot: seams.designRoot }),
          )) as ExecuteResult,
      ),
  );

  server.registerTool(
    'check',
    {
      title: 'Check a Figma page',
      annotations: ANNOTATIONS.check,
      description:
        'Run the zaku rules over the current page, one node or every page; show the findings in the plugin and return them',
      inputSchema: {
        file,
        scope: z
          .enum(['page', 'node', 'all'])
          .default('page')
          .describe('page: the current page; node: the node nodeId names; all: every page'),
        nodeId: z.string().optional().describe('The node to check when scope is node'),
      },
      outputSchema: OUTPUTS.check,
    },
    ({ file: name, scope, nodeId }) =>
      answer(() =>
        runCheck(
          seams.bridge,
          seams.bridge.session(name),
          scope === 'node' ? { nodeId: nodeId ?? '' } : scope === 'all' ? { all: true } : { page: true },
        ),
      ),
  );

  server.registerTool(
    'get_screenshot',
    {
      title: 'Screenshot a Figma node',
      annotations: ANNOTATIONS.get_screenshot,
      description: [
        "Renders one node of an open file as a PNG and returns it as an image, with the node's id and name, the PNG's width and height in pixels and the scale.",
        `A PNG over ${SCREENSHOT_LIMITS.maxBytes} bytes or ${SCREENSHOT_LIMITS.maxDimension} px a side is refused with a maxDimension that fits.`,
        `It waits for a running execute and takes up to ${seams.runTimeoutMs / 1000} s. Pass a frame or a layer, not a page.`,
      ].join(' '),
      inputSchema: {
        file,
        nodeId: z
          .string()
          .describe('The node to render, such as 1:23, from read, check or execute: a frame or a layer, not a page'),
        scale: z
          .number()
          .min(SCREENSHOT_LIMITS.minScale)
          .max(SCREENSHOT_LIMITS.maxScale)
          .optional()
          .describe(
            `Pixels per unit of the node's size, ${SCREENSHOT_LIMITS.minScale} to ${SCREENSHOT_LIMITS.maxScale}; taken over maxDimension when given`,
          ),
        maxDimension: z
          .number()
          .int()
          .min(SCREENSHOT_LIMITS.minDimension)
          .max(SCREENSHOT_LIMITS.maxDimension)
          .default(SCREENSHOT_LIMITS.defaultDimension)
          .describe(
            `The pixels the node's longer side is rendered at, ${SCREENSHOT_LIMITS.minDimension} to ${SCREENSHOT_LIMITS.maxDimension}, default ${SCREENSHOT_LIMITS.defaultDimension}; a small node is enlarged at most ${SCREENSHOT_LIMITS.maxUpscale}x`,
          ),
      },
      outputSchema: OUTPUTS.get_screenshot,
    },
    async ({ file: name, nodeId, scale, maxDimension }) => {
      const size: ScreenshotSize = scale !== undefined ? { scale } : { maxDimension };
      try {
        const session = seams.bridge.session(name);
        // A held execute's nodes are not the file's yet; the render waits until it is decided.
        return pictured(await seams.bridge.exclusive(session, () => seams.bridge.screenshot(session, nodeId, size)));
      } catch (error) {
        const text = refusalText(error, seams.listening().portError);
        if (text === null) throw error;
        return refused(text);
      }
    },
  );

  server.registerTool(
    'pair',
    {
      title: 'Pair the zaku plugin',
      annotations: ANNOTATIONS.pair,
      description: 'A one-time code the user types into the zaku panel in Figma to pair it; replaces any earlier code',
      inputSchema: {},
      outputSchema: OUTPUTS.pair,
    },
    () =>
      answer(async () => {
        const { code, expiresAt } = seams.pairings.issueCode();
        const minutes = CODE_LIFETIME_MS / 60_000;
        const { port } = seams.listening();
        const where =
          port === null
            ? ''
            : ` zaku-mcp is on port ${port}. If the panel says Not connected, or refuses the code as wrong, the user enters that port in the panel (Use another port) and types the code again.`;
        const next = `Type the code into the zaku panel in Figma (Plugins > zaku). It works once, for ${minutes} minutes.${where}`;
        const expires = new Date(expiresAt).toISOString();
        // A dialog shows the code to the user as it is; in a tool result the model would have to repeat it.
        if (server.server.getClientCapabilities()?.elicitation?.form) {
          try {
            await server.server.elicitInput({
              mode: 'form',
              message: `Your zaku pairing code is ${displayCode(code)}. ${next}`,
              requestedSchema: { type: 'object', properties: {} },
            });
            return { shown: 'The code is in a dialog the user saw.', expiresAt: expires, port, next };
          } catch {
            // The client declared the capability and still failed the request; the code goes in the result.
          }
        }
        return { code: displayCode(code), expiresAt: expires, port, next };
      }),
  );

  server.registerTool(
    'pairings',
    {
      title: 'List zaku pairings',
      annotations: ANNOTATIONS.pairings,
      description: 'The Figma plugins paired with this machine, and the state of the pairing code',
      inputSchema: {},
      outputSchema: OUTPUTS.pairings,
    },
    () => answer(async () => ({ pairings: await seams.pairings.list(), code: seams.pairings.codeReport() })),
  );

  server.registerTool(
    'unpair',
    {
      title: 'Unpair the zaku plugin',
      annotations: ANNOTATIONS.unpair,
      description: 'Revoke a pairing, or all of them, and close their connections; returns how many were revoked',
      inputSchema: { id: z.string().describe('A pairing id from pairings, or all') },
      outputSchema: OUTPUTS.unpair,
    },
    ({ id }) => answer(async () => ({ revoked: await seams.pairings.revoke(id) })),
  );
}
