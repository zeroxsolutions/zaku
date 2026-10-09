import type { MessageBus } from '@zeroxsolutions/cosmic';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { FigmaBridge } from '../../lib/adapters/figma-bridge.js';
import { ExecuteScript } from '../../lib/commands/index.js';
import { UnknownTopic } from '../../lib/domain/errors/index.js';
import type { IDesignConfigRepository } from '../../lib/repositories/design-config-repository.js';
import type { IGuideRepository } from '../../lib/repositories/guide-repository.js';
import { runCheck } from './check.js';
import { refusalText } from './error-map.js';

export interface ToolSeams {
  bus: MessageBus;
  bridge: FigmaBridge;
  guides: IGuideRepository;
  config: IDesignConfigRepository;
  designRoot: string;
  listening: () => { port: number | null; portError: string | null };
}

type ToolResult = { content: { type: 'text'; text: string }[]; isError?: boolean };

const ok = (body: unknown): ToolResult => ({ content: [{ type: 'text', text: JSON.stringify(body, null, 2) }] });
const refused = (text: string): ToolResult => ({
  content: [{ type: 'text', text: JSON.stringify({ error: text }) }],
  isError: true,
});

/** Runs a tool body; a domain refusal becomes an error result, anything else is rethrown for the SDK to report. */
async function answerWith(body: () => Promise<unknown>, portError: string | null): Promise<ToolResult> {
  try {
    return ok(await body());
  } catch (error) {
    const text = refusalText(error, portError);
    if (text === null) throw error;
    return refused(text);
  }
}

const file = z.string().optional().describe('The connected file; needed only when more than one is open');

export function registerTools(server: McpServer, seams: ToolSeams): void {
  const answer = (body: () => Promise<unknown>): Promise<ToolResult> => answerWith(body, seams.listening().portError);

  server.registerTool(
    'get_state',
    { description: 'The connected Figma files, the bridge port and whether zaku.yaml loaded', inputSchema: {} },
    () =>
      answer(async () => {
        let config: { loaded: boolean; error?: string };
        try {
          config = { loaded: (await seams.config.readOptional(seams.designRoot)) !== null };
        } catch (error) {
          config = { loaded: false, error: error instanceof Error ? error.message : String(error) };
        }
        return { files: seams.bridge.sessions(), ...seams.listening(), designRoot: seams.designRoot, config };
      }),
  );

  server.registerTool(
    'read_guide',
    { description: 'A zaku skill or rule, by name', inputSchema: { topic: z.string() } },
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
      description:
        'An outline of a node subtree in an open file: type, name, size, layout, bound variables, component, text',
      inputSchema: {
        file,
        nodeId: z.string().optional(),
        path: z.string().optional().describe('Names from the page down, Page/Frame/Layer'),
        depth: z.number().int().min(0).max(6).default(2),
      },
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
      description:
        'Run a Figma plugin script in an open file; the change is checked against zaku rules and rolled back on a finding in strict mode',
      inputSchema: { file, script: z.string(), mode: z.enum(['strict', 'report']).default('strict') },
    },
    ({ file: name, script, mode }) => answer(() => seams.bus.send(new ExecuteScript({ file: name, script, mode }))),
  );

  server.registerTool(
    'check',
    {
      description:
        'Run the zaku rules over the current page, one node, or every page, and show the findings in the plugin',
      inputSchema: { file, scope: z.enum(['page', 'node', 'all']).default('page'), nodeId: z.string().optional() },
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
}
