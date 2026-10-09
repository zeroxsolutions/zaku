import { BRIDGE_PORTS } from '@zeroxsolutions/zaku/schema';
import { useMemo } from 'react';
import { z } from 'zod';

const FIRST_PORT = BRIDGE_PORTS[0];
const LAST_PORT = BRIDGE_PORTS[BRIDGE_PORTS.length - 1];

export type PortFormSchema = ReturnType<typeof buildPortFormSchema>;

/** The panel has no message catalogue, so the messages are English here; every check names the range. */
function buildPortFormSchema(): z.ZodObject<{ port: z.ZodString }> {
  const message = `Enter a port from ${FIRST_PORT} to ${LAST_PORT}.`;
  return z.object({
    port: z
      .string()
      .min(1, { message, abort: true })
      .regex(/^\d+$/, { message, abort: true })
      .refine((port) => BRIDGE_PORTS.some((admitted) => admitted === Number(port)), { message }),
  });
}

/** The Port form's schema: a port the plugin's manifest admits, typed as digits. */
export function usePortFormSchema(): PortFormSchema {
  return useMemo(buildPortFormSchema, []);
}
