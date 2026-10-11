import { dirname, join } from 'node:path';
import { z } from 'zod';

/** The first line a client sends the hub: who it is, where it works, and the build it runs. */
export const clientHelloSchema = z
  .object({
    type: z.literal('client'),
    cwd: z.string(),
    designRoot: z.string(),
    build: z.number(),
    /** Asks the hub to give way, which it does only for a newer build. */
    handover: z.boolean().optional(),
  })
  .strict();

/** The hub's answer: its build, its panel port, and whether it is giving way to the client's newer build. */
export const hubHelloSchema = z
  .object({
    type: z.literal('hub'),
    build: z.number(),
    port: z.number().nullable(),
    handingOver: z.boolean().optional(),
  })
  .strict();

export type ClientHello = z.output<typeof clientHelloSchema>;
export type HubHello = z.output<typeof hubHelloSchema>;

/** How long the hub waits after its last client leaves, so a panel is not paired again between two sessions. */
export const HUB_IDLE_MS = 30 * 60_000;

/** The hub's socket and pid file, beside the pairings file, in a directory only the user reads. */
export function hubPaths(pairingsFile: string): { socket: string; pid: string } {
  const dir = dirname(pairingsFile);
  return { socket: join(dir, 'hub.sock'), pid: join(dir, 'hub.pid') };
}
