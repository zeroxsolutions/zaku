import { homedir } from 'node:os';
import { BRIDGE_PORT } from '@zeroxsolutions/zaku/schema';
import { pairingsPath, serveStdio, startMcp } from '@zeroxsolutions/zaku/mcp';

const runtime = await startMcp({
  cwd: process.cwd(),
  env: process.env,
  skillsDir: process.env['ZAKU_SKILLS_DIR'] ?? '',
  port: BRIDGE_PORT,
  pairingsFile: pairingsPath(process.env, process.platform, homedir()),
});
if (runtime.portError) process.stderr.write(`zaku-mcp: ${runtime.portError}\n`);
await serveStdio(runtime);
