import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  DEFAULT_TIMINGS,
  FigmaBridge,
  type BridgeConnection,
  type BridgeTimings,
  type Session,
} from '../../lib/adapters/figma-bridge.js';
import { FileLeases } from '../../lib/domain/file-leases.js';
import { PairingCodes } from '../../lib/domain/pairing-codes.js';
import { DesignConfigRepository } from '../../lib/repositories/design-config-repository.js';
import { GuideRepository } from '../../lib/repositories/guide-repository.js';
import { FilePairingStore } from '../../lib/repositories/pairing-store.js';
import { PLUGIN_VERSION } from '../../lib/schema/bridge.js';
import type { CopyConfig } from '../../lib/schema/zaku-config.js';
import { runCheck } from './check.js';
import { compose } from './dependencies.js';
import { Pairings } from './pairings.js';
import { listenFirstFree, type Listening } from './socket.js';
import { registerTools, type PortHolder } from './tools.js';

/** One agent session the hub serves: the leases name it by id, a refusal by cwd, and run_script reads its designRoot. */
export interface ClientInfo {
  id: string;
  cwd: string;
  designRoot: string;
}

export interface HubSeams {
  skillsDir: string;
  /** The ports to listen on for the panels, tried in order until one is free. */
  ports: readonly number[];
  timings?: BridgeTimings;
  /** How often to try the ports again while other processes hold every one. */
  retryListenMs?: number;
  pairingsFile: string;
  admitMs?: number;
  /** The binary's build stamp; a client with a newer one takes the hub over. */
  build: number;
  now?: () => number;
  /** The processes holding the panel ports below the hub's own. */
  portHolders?: (below: number | null) => Promise<PortHolder[]>;
}

export interface HubCore {
  readonly bridge: FigmaBridge;
  readonly pairings: Pairings;
  readonly leases: FileLeases<BridgeConnection>;
  readonly port: number | null;
  readonly portError: string | null;
  readonly build: number;
  /** A server for one client; its leases end when it closes. */
  serve(client: ClientInfo): McpServer;
  close(): Promise<void>;
}

/** The bridge, the pairings, the panel socket and the leases, which every client's tools share. */
export async function startHubCore(seams: HubSeams): Promise<HubCore> {
  const timings = seams.timings ?? DEFAULT_TIMINGS;
  const now = seams.now ?? Date.now;
  const bridge = new FigmaBridge(timings);
  const guides = new GuideRepository(seams.skillsDir);
  const bus = compose(bridge, guides);
  const leases = new FileLeases<BridgeConnection>(now);
  const config = new DesignConfigRepository();
  /** Each connected client's design directory, so a panel's own check reads the copy of the session holding it. */
  const designRoots = new Map<string, string>();
  const holderCopy = async (session: Session): Promise<CopyConfig | undefined> => {
    const root = designRoots.get(leases.holder(session.connection)?.client.id ?? '');
    return root === undefined ? undefined : (await config.readOptional(root))?.copy;
  };
  bridge.onCheck(
    (session, scope) =>
      void holderCopy(session)
        .then((copy) => runCheck(bridge, session, scope, copy))
        .catch(() => undefined),
  );
  bridge.onDetach((connection) => leases.drop(connection));
  /** Clients with an open server; a code's issuer that left is given no file. */
  const connected = new Set<string>();
  const pairings = new Pairings(new PairingCodes(now), new FilePairingStore(seams.pairingsFile));
  const listen = (): Promise<Listening> =>
    listenFirstFree(bridge, pairings, seams.ports, seams.admitMs, (connection, issuer) => {
      if (connected.has(issuer.id)) leases.grant(connection, issuer);
    });
  let listening: Listening = await listen();
  let retrying = false;
  let closed = false;
  // Other zaku-mcp processes may hold every port until one exits; listen as soon as one lets go.
  const retry =
    'error' in listening
      ? setInterval(() => {
          if (retrying) return;
          retrying = true;
          void listen().then((next) => {
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
  const servers = new Set<McpServer>();
  return {
    bridge,
    pairings,
    leases,
    build: seams.build,
    get port(): number | null {
      return port();
    },
    get portError(): string | null {
      return portError();
    },
    serve: (client: ClientInfo): McpServer => {
      const server = new McpServer({ name: 'zaku', version: PLUGIN_VERSION });
      registerTools(server, {
        bus,
        bridge,
        guides,
        pairings,
        config,
        designRoot: client.designRoot,
        listening: () => ({ port: port(), portError: portError() }),
        runTimeoutMs: timings.timeoutMs,
        client,
        leases,
        hub: {
          build: seams.build,
          portHolders: (): Promise<PortHolder[]> =>
            seams.portHolders ? seams.portHolders(port()) : Promise.resolve([]),
        },
      });
      servers.add(server);
      connected.add(client.id);
      designRoots.set(client.id, client.designRoot);
      server.server.onclose = (): void => {
        servers.delete(server);
        connected.delete(client.id);
        designRoots.delete(client.id);
        leases.release(client.id);
      };
      return server;
    },
    close: async (): Promise<void> => {
      closed = true;
      clearInterval(retry);
      for (const server of [...servers]) await server.close();
      if ('close' in listening) await listening.close();
    },
  };
}
