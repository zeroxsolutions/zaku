import { homedir } from 'node:os';
import { bridgePorts, pairingsPath, serveStdio, startMcp } from '@zeroxsolutions/zaku/mcp';

let ports: readonly number[];
try {
  ports = bridgePorts(process.env);
} catch (error) {
  // The client shows a server that exits at startup as failed, with this line in its log.
  process.stderr.write(`zaku-mcp: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
const runtime = await startMcp({
  cwd: process.cwd(),
  env: process.env,
  skillsDir: process.env['ZAKU_SKILLS_DIR'] ?? '',
  ports,
  pairingsFile: pairingsPath(process.env, process.platform, homedir()),
});
if (runtime.portError) process.stderr.write(`zaku-mcp: ${runtime.portError}\n`);
await serveStdio(runtime);
