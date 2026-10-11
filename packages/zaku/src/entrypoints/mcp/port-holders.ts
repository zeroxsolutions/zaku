import { execFile } from 'node:child_process';
import type { PortHolder } from './tools.js';

export type Run = (command: string, args: readonly string[]) => Promise<string>;

/** Runs a command and answers its stdout; lsof exits 1 when nothing holds the port, which is an empty answer. */
export const runCommand: Run = (command, args) =>
  new Promise((resolve, reject) =>
    execFile(command, [...args], (error, stdout) => {
      if (error && (error as NodeJS.ErrnoException).code === 'ENOENT') reject(error);
      else resolve(String(stdout));
    }),
  );

/** lsof's `-F pc` output: a `p<pid>` line, then a `c<command>` line, for each process. */
export function parseLsof(port: number, output: string): PortHolder[] {
  const holders: PortHolder[] = [];
  let pid: number | null = null;
  for (const line of output.split('\n')) {
    if (line.startsWith('p')) pid = Number(line.slice(1));
    if (line.startsWith('c') && pid !== null) holders.push({ port, pid, command: line.slice(1) });
  }
  return holders;
}

/**
 * The processes listening on the panel ports below the hub's own, which a panel dials before it reaches the hub: a
 * zaku-mcp from before the hub, most likely. None when the hub has no port, or lsof cannot run.
 */
export async function portHolders(
  ports: readonly number[],
  hubPort: number | null,
  run: Run = runCommand,
): Promise<PortHolder[]> {
  if (hubPort === null) return [];
  const below = ports.filter((port) => port < hubPort);
  try {
    const answers = await Promise.all(
      below.map(async (port) => parseLsof(port, await run('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-Fpc']))),
    );
    return answers.flat();
  } catch {
    return [];
  }
}
