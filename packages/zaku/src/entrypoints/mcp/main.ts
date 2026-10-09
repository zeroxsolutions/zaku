import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { resolve } from 'node:path';
import { DEFAULT_TIMINGS, FigmaBridge, type BridgeTimings } from '../../lib/adapters/figma-bridge.js';
import { DesignConfigRepository } from '../../lib/repositories/design-config-repository.js';
import { GuideRepository } from '../../lib/repositories/guide-repository.js';
import { PLUGIN_VERSION } from '../../lib/schema/bridge.js';
import { runCheck } from './check.js';
import { compose } from './dependencies.js';
import { listenBridge, type Listening } from './socket.js';
import { registerTools } from './tools.js';

export interface McpSeams {
  cwd: string;
  env: Record<string, string | undefined>;
  skillsDir: string;
  port: number;
  timings?: BridgeTimings;
  /** How often to try the port again while another process holds it. */
  retryListenMs?: number;
}

export interface McpRuntime {
  server: McpServer;
  readonly port: number | null;
  readonly portError: string | null;
  close(): Promise<void>;
}

/** Wires the bridge, the bus and the tools, and opens the socket the plugin dials. Stdio is attached by the caller. */
export async function startMcp(seams: McpSeams): Promise<McpRuntime> {
  const bridge = new FigmaBridge(seams.timings ?? DEFAULT_TIMINGS);
  const guides = new GuideRepository(seams.skillsDir);
  const bus = compose(bridge, guides);
  // A failed panel check has nobody waiting on it; the panel keeps its last findings.
  bridge.onCheck((session, scope) => void runCheck(bridge, session, scope).catch(() => undefined));
  let listening: Listening = await listenBridge(bridge, seams.port);
  let retrying = false;
  let closed = false;
  // Another session's zaku-mcp may hold the port until it exits; listen as soon as it lets go.
  const retry =
    'error' in listening
      ? setInterval(() => {
          if (retrying) return;
          retrying = true;
          void listenBridge(bridge, seams.port).then((next) => {
            retrying = false;
            if (closed || !('error' in listening)) {
              if ('close' in next) void next.close();
              return;
            }
            listening = next;
            if ('port' in next) clearInterval(retry);
          });
        }, seams.retryListenMs ?? 5000)
      : undefined;
  retry?.unref();
  const port = (): number | null => ('port' in listening ? listening.port : null);
  const portError = (): string | null => ('error' in listening ? listening.error : null);
  const server = new McpServer({ name: 'zaku', version: PLUGIN_VERSION });
  registerTools(server, {
    bus,
    bridge,
    guides,
    config: new DesignConfigRepository(),
    designRoot: resolve(seams.cwd, seams.env['ZAKU_DESIGN_ROOT'] ?? 'docs/design'),
    listening: () => ({ port: port(), portError: portError() }),
  });
  return {
    server,
    get port(): number | null {
      return port();
    },
    get portError(): string | null {
      return portError();
    },
    close: async (): Promise<void> => {
      closed = true;
      clearInterval(retry);
      await server.close();
      if ('close' in listening) await listening.close();
    },
  };
}

/**
 * Serves the tools on stdin and stdout. The client ends a session by closing stdin; a server that
 * outlived it would keep the bridge port, and the next session's server could not listen.
 */
export async function serveStdio(runtime: McpRuntime): Promise<void> {
  let closing = false;
  const shutdown = (): void => {
    if (closing) return;
    closing = true;
    void runtime.close().finally(() => process.exit(0));
  };
  process.stdin.once('end', shutdown);
  process.stdin.once('close', shutdown);
  await runtime.server.connect(new StdioServerTransport());
}
