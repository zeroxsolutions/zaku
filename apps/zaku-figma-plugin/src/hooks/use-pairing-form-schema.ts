import { PAIRING_CODE_LENGTH } from '@zeroxsolutions/zaku/schema';
import { useMemo } from 'react';
import { z } from 'zod';

export type PairingFormSchema = ReturnType<typeof buildPairingFormSchema>;

/** The panel has no message catalogue, so the messages are English here. */
function buildPairingFormSchema(): z.ZodObject<{ code: z.ZodString }> {
  return z.object({
    code: z
      .string()
      .min(1, { message: 'Type the code your agent shows.', abort: true })
      .regex(/^\d+$/, { message: 'The code is digits only.', abort: true })
      .length(PAIRING_CODE_LENGTH, { message: `The code has ${PAIRING_CODE_LENGTH} digits.` }),
  });
}

/** The pairing form's schema: the digits of one pairing code. */
export function usePairingFormSchema(): PairingFormSchema {
  return useMemo(buildPairingFormSchema, []);
}
