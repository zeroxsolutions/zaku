import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { resolve } from 'node:path';
import type { BridgeTimings } from '../../lib/adapters/figma-bridge.js';
import { startHubCore } from './hub.js';

export interface McpSeams {
  cwd: string;
  env: Record<string, string | undefined>;
  skillsDir: string;
  /** The ports to listen on, tried in order until one is free; `bridgePorts` gives the ones the plugin can reach. */
  ports: readonly number[];
  timings?: BridgeTimings;
  /** How often to try the ports again while other processes hold every one. */
  retryListenMs?: number;
  /** The file the pairings' token hashes are kept in; `pairingsPath` gives the user's own. */
  pairingsFile: string;
  /** How long a connection may stay open before it presents a valid credential; five seconds when omitted. */
  admitMs?: number;
}

export interface McpRuntime {
  server: McpServer;
  readonly port: number | null;
  readonly portError: string | null;
  close(): Promise<void>;
}

/**
 * The hub core with one client in this process: the spec's way in, and a server for a caller that wants no hub.
 * Stdio is attached by the caller.
 */
export async function startMcp(seams: McpSeams): Promise<McpRuntime> {
  const core = await startHubCore({
    skillsDir: seams.skillsDir,
    ports: seams.ports,
    pairingsFile: seams.pairingsFile,
    build: 0,
    ...(seams.timings ? { timings: seams.timings } : {}),
    ...(seams.retryListenMs !== undefined ? { retryListenMs: seams.retryListenMs } : {}),
    ...(seams.admitMs !== undefined ? { admitMs: seams.admitMs } : {}),
  });
  const server = core.serve({
    id: 'local',
    cwd: seams.cwd,
    designRoot: resolve(seams.cwd, seams.env['ZAKU_DESIGN_ROOT'] ?? 'docs/design'),
  });
  return {
    server,
    get port(): number | null {
      return core.port;
    },
    get portError(): string | null {
      return core.portError;
    },
    close: () => core.close(),
  };
}

/**
 * Serves the tools on stdin and stdout. The client ends a session by closing stdin; a server that
 * outlived it would keep its bridge port, and the next session's server would have one port fewer.
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
