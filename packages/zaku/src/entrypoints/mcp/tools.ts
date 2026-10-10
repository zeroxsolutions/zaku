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
  /** How long a script may run before the bridge rolls it back, as run_script's script field states it. */
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
  .describe("A connected file's name from get_bridge_state; needed only when more than one is open");
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
 * What each tool answers. The SDK lists an output schema only when its root is an object, so run_script's two
 * outcomes share one object: on `unknown`, every field but `outcome` and `message` is absent.
 */
const OUTPUTS = {
  get_bridge_state: {
    files: z.array(sessionViewSchema).describe('The files with the zaku plugin open and paired'),
    port,
    portError: z.string().nullable().describe('Why zaku-mcp is not listening; null while it is'),
    pairing: codeReportSchema,
    designRoot: z.string().describe("The design directory whose zaku.yaml run_script's copy rules read"),
    config: configSchema,
  },
  read_guide: {
    topic: z.string().describe('The topic asked for'),
    text: z.string().describe('The guide, as markdown'),
  },
  read_nodes: {
    nodes: z.array(outlineNodeSchema).describe('The nodes found, each with its children to the depth asked'),
  },
  run_script: settledRunSchema.partial().extend({
    outcome: z
      .enum([...settledRunSchema.shape.outcome.options, lostRunSchema.shape.outcome.value])
      .describe(
        'committed keeps the change; rolled-back undid it; partly-rolled-back left nodes; unknown: call read_nodes before running it again',
      ),
  }).shape,
  check_rules: { checked: z.number().int().describe('How many nodes the rules read'), findings },
  issue_pairing_code: {
    code: z
      .string()
      .optional()
      .describe('The code to show the user, two groups of four digits; absent when a dialog showed it'),
    shown: z.string().optional().describe('Set instead of code when the user saw the code in a dialog'),
    expiresAt,
    port,
    next: z.string().describe('What to tell the user to do with the code'),
  },
  list_pairings: { pairings: z.array(pairingSchema).describe('Every stored pairing'), code: codeReportSchema },
  revoke_pairing: { revoked: z.number().int().describe('How many pairings were revoked') },
  get_screenshot: screenshotSchema.shape,
} satisfies Record<string, z.ZodRawShape>;

/**
 * What each tool may do to the file and the pairings, for a host deciding what to ask the user. None reaches past
 * this machine: the plugin, the pairings file and the skills are all local.
 */
const reads = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;
const ANNOTATIONS = {
  get_bridge_state: reads,
  read_guide: reads,
  read_nodes: reads,
  get_screenshot: reads,
  list_pairings: reads,
  // It removes and changes nodes, and two runs of one script draw twice.
  run_script: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  // It replaces the findings the panel shows, and nothing else.
  check_rules: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  // A new code ends the one before it.
  issue_pairing_code: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  revoke_pairing: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
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
    'get_bridge_state',
    {
      title: 'Get the bridge state',
      annotations: ANNOTATIONS.get_bridge_state,
      description:
        "Reports the bridge and returns the open files, the port, the pairing code's state and whether zaku.yaml loaded.",
      inputSchema: {},
      outputSchema: OUTPUTS.get_bridge_state,
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
      title: 'Read a guide',
      annotations: ANNOTATIONS.read_guide,
      description: "Reads a zaku skill's or rule's guide and returns its topic and its text as markdown.",
      inputSchema: {
        topic: z
          .string()
          .describe(
            'A skill name, such as drawing-a-screen, or a rule id, such as binding; an unknown one is refused with every topic',
          ),
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
    'read_nodes',
    {
      title: 'Read nodes',
      annotations: ANNOTATIONS.read_nodes,
      description:
        "Reads a node subtree and returns each node's type, name, size, layout, bound variables, component and text.",
      inputSchema: {
        file,
        nodeId: z.string().optional().describe('The node to read, such as 1:23; taken over path'),
        path: z.string().optional().describe('Names from the page down, Page/Frame/Layer; read when nodeId is absent'),
        depth: z.number().int().min(0).max(6).default(2).describe('Levels of children to include, 0 to 6'),
      },
      outputSchema: OUTPUTS.read_nodes,
    },
    ({ file: name, nodeId, path, depth }) =>
      answer(async () => {
        const session = seams.bridge.session(name);
        const target = nodeId ? { nodeId } : { path: path ?? '' };
        return { nodes: await seams.bridge.read(session, target, depth) };
      }),
  );

  server.registerTool(
    'run_script',
    {
      title: 'Run a script',
      annotations: ANNOTATIONS.run_script,
      description:
        'Runs a Figma plugin script in an open file, checks what it touched, and returns the outcome and the findings.',
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
      outputSchema: OUTPUTS.run_script,
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
    'check_rules',
    {
      title: 'Check the rules',
      annotations: ANNOTATIONS.check_rules,
      description:
        'Checks the zaku rules over a page, a node or every page, shows the findings in the plugin, and returns them.',
      inputSchema: {
        file,
        scope: z
          .enum(['page', 'node', 'all'])
          .default('page')
          .describe('page: the current page; node: the node nodeId names; all: every page'),
        nodeId: z.string().optional().describe('The node to check when scope is node'),
      },
      outputSchema: OUTPUTS.check_rules,
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
      title: 'Get a screenshot',
      annotations: ANNOTATIONS.get_screenshot,
      description: 'Renders one node as a PNG and returns it as an image with its id, name, size in pixels and scale.',
      inputSchema: {
        file,
        nodeId: z
          .string()
          .describe(
            `The node to render, such as 1:23, from read_nodes, check_rules or run_script: a frame or a layer, not a page; it waits for a running run_script and renders within ${seams.runTimeoutMs / 1000} s`,
          ),
        scale: z
          .number()
          .min(SCREENSHOT_LIMITS.minScale)
          .max(SCREENSHOT_LIMITS.maxScale)
          .optional()
          .describe(
            `Pixels per unit of the node's size, ${SCREENSHOT_LIMITS.minScale} to ${SCREENSHOT_LIMITS.maxScale}; taken over maxDimension when given; a render past ${SCREENSHOT_LIMITS.maxDimension} px a side is refused`,
          ),
        maxDimension: z
          .number()
          .int()
          .min(SCREENSHOT_LIMITS.minDimension)
          .max(SCREENSHOT_LIMITS.maxDimension)
          .default(SCREENSHOT_LIMITS.defaultDimension)
          .describe(
            `The pixels the node's longer side is rendered at, ${SCREENSHOT_LIMITS.minDimension} to ${SCREENSHOT_LIMITS.maxDimension}, default ${SCREENSHOT_LIMITS.defaultDimension}; a small node is enlarged at most ${SCREENSHOT_LIMITS.maxUpscale}x; a PNG over ${SCREENSHOT_LIMITS.maxBytes} bytes is refused with a maxDimension that fits`,
          ),
      },
      outputSchema: OUTPUTS.get_screenshot,
    },
    async ({ file: name, nodeId, scale, maxDimension }) => {
      const size: ScreenshotSize = scale !== undefined ? { scale } : { maxDimension };
      try {
        const session = seams.bridge.session(name);
        // A held script's nodes are not the file's yet; the render waits until it is decided.
        return pictured(await seams.bridge.exclusive(session, () => seams.bridge.screenshot(session, nodeId, size)));
      } catch (error) {
        const text = refusalText(error, seams.listening().portError);
        if (text === null) throw error;
        return refused(text);
      }
    },
  );

  server.registerTool(
    'issue_pairing_code',
    {
      title: 'Issue a pairing code',
      annotations: ANNOTATIONS.issue_pairing_code,
      description: [
        'Issues a code the user types into the zaku panel in Figma and returns it, when it expires, the port and what to do.',
        `It works once, for ${CODE_LIFETIME_MS / 60_000} minutes, and the next code issued ends it.`,
      ].join(' '),
      inputSchema: {},
      outputSchema: OUTPUTS.issue_pairing_code,
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
    'list_pairings',
    {
      title: 'List the pairings',
      annotations: ANNOTATIONS.list_pairings,
      description: "Lists the zaku plugins paired with this machine and returns them with the pairing code's state.",
      inputSchema: {},
      outputSchema: OUTPUTS.list_pairings,
    },
    () => answer(async () => ({ pairings: await seams.pairings.list(), code: seams.pairings.codeReport() })),
  );

  server.registerTool(
    'revoke_pairing',
    {
      title: 'Revoke a pairing',
      annotations: ANNOTATIONS.revoke_pairing,
      description: 'Revokes a pairing, or all of them, closes their connections, and returns how many were revoked.',
      inputSchema: { id: z.string().describe('A pairing id from list_pairings, or all for every pairing') },
      outputSchema: OUTPUTS.revoke_pairing,
    },
    ({ id }) => answer(async () => ({ revoked: await seams.pairings.revoke(id) })),
  );
}
