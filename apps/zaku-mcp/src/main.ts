import { spawn } from 'node:child_process';
import { rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import {
  bridgePorts,
  hubPaths,
  listenHub,
  pairingsPath,
  portHolders,
  runClient,
  startHubCore,
  type HubServer,
} from '@zeroxsolutions/zaku/mcp';

let ports: readonly number[];
try {
  ports = bridgePorts(process.env);
} catch (error) {
  // The client shows a server that exits at startup as failed, with this line in its log.
  process.stderr.write(`zaku-mcp: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
const pairingsFile = pairingsPath(process.env, process.platform, homedir());
const paths = hubPaths(pairingsFile);
// A client of a newer build than the hub asks it to give way; the binary's own mtime orders two builds.
const build = statSync(process.execPath).mtimeMs;

if (process.argv[2] === 'hub') {
  let server: HubServer | null = null;
  let stopping = false;
  // Closing the server unlinks the socket, so the next client finds no stale file to race other hubs over.
  const stop = (): void => {
    if (stopping) return;
    stopping = true;
    rmSync(paths.pid, { force: true });
    void (server?.close() ?? Promise.resolve()).then(() => server?.core.close()).finally(() => process.exit(0));
  };
  const listened = await listenHub(
    () =>
      startHubCore({
        skillsDir: process.env['ZAKU_SKILLS_DIR'] ?? '',
        ports,
        pairingsFile,
        build,
        portHolders: (hubPort) => portHolders(ports, hubPort),
      }),
    paths.socket,
    { onIdle: stop, onHandover: stop },
  );
  // Another hub holds the socket; its clients reach it.
  if ('error' in listened) process.exit(0);
  server = listened;
  writeFileSync(paths.pid, String(process.pid));
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
} else {
  try {
    const code = await runClient({
      socketPath: paths.socket,
      build,
      cwd: process.cwd(),
      designRoot: resolve(process.cwd(), process.env['ZAKU_DESIGN_ROOT'] ?? 'docs/design'),
      spawnHub: () => spawn(process.execPath, ['hub'], { detached: true, stdio: 'ignore', env: process.env }).unref(),
      stdin: process.stdin,
      stdout: process.stdout,
    });
    process.exit(code);
  } catch (error) {
    process.stderr.write(`zaku-mcp: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}
