import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { PairingNotFound } from '../../lib/domain/errors/index.js';
import { PairingCodes, type CodeStatus } from '../../lib/domain/pairing-codes.js';
import type { IPairingStore, Pairing } from '../../lib/repositories/pairing-store.js';
import type { Credential, RefusalReason } from '../../lib/schema/bridge.js';

export type Admission =
  | { kind: 'admitted'; pairing: Pairing; issued: string | null }
  | { kind: 'refused'; reason: RefusalReason };

/** The code status as the agent reads it from get_state and pairings. */
export const codeReportSchema = z
  .discriminatedUnion('state', [
    z.object({ state: z.literal('none') }).strict(),
    z
      .object({
        state: z.literal('live'),
        expiresAt: z.string().describe('ISO 8601'),
        attemptsLeft: z.number().int().describe('Wrong codes the panel may still type before the code is used up'),
      })
      .strict(),
    z.object({ state: z.literal('used-up'), message: z.string() }).strict(),
  ])
  .describe('The pairing code: none issued, live until expiresAt, or used up by wrong attempts');

export type CodeReport = z.output<typeof codeReportSchema>;

export const USED_UP_MESSAGE = 'This code was used up by wrong attempts. Ask your agent for a new one.';

/** 256 random bits; the plugin presents them in every later hello. */
const newToken = (): string => randomBytes(32).toString('base64url');

/** The live code, the stored pairings, and the open connections each pairing admitted. */
export class Pairings {
  private readonly connections = new Map<string, Set<() => void>>();

  constructor(
    private readonly codes: PairingCodes,
    private readonly store: IPairingStore,
  ) {}

  issueCode(): { code: string; expiresAt: number } {
    return this.codes.issue();
  }

  codeReport(): CodeReport {
    const status: CodeStatus = this.codes.status();
    if (status.state === 'live')
      return { state: 'live', expiresAt: new Date(status.expiresAt).toISOString(), attemptsLeft: status.attemptsLeft };
    if (status.state === 'used-up') return { state: 'used-up', message: USED_UP_MESSAGE };
    return status;
  }

  /** A valid code issues a token for the file; a known token admits as it is. */
  async admit(credential: Credential, file: string): Promise<Admission> {
    if ('token' in credential) {
      const pairing = await this.store.find(credential.token);
      return pairing ? { kind: 'admitted', pairing, issued: null } : { kind: 'refused', reason: 'unknown-token' };
    }
    const redeemed = this.codes.redeem(credential.code);
    if (redeemed.kind === 'refused') return redeemed;
    const token = newToken();
    return { kind: 'admitted', pairing: await this.store.add(token, file), issued: token };
  }

  /** Remembers how to close a connection the pairing admitted, so revoking it ends the connection too. */
  track(id: string, close: () => void): () => void {
    const open = this.connections.get(id) ?? new Set();
    open.add(close);
    this.connections.set(id, open);
    return () => open.delete(close);
  }

  list(): Promise<Pairing[]> {
    return this.store.list();
  }

  /**
   * Revokes one pairing by id, or every pairing for `all`, and closes their connections.
   * @throws PairingNotFound when no pairing has the id
   */
  async revoke(id: string): Promise<number> {
    if (id === 'all') {
      const revoked = await this.store.revokeAll();
      for (const key of [...this.connections.keys()]) this.disconnect(key);
      return revoked;
    }
    if (!(await this.store.revoke(id)))
      throw new PairingNotFound(
        id,
        (await this.store.list()).map((p) => p.id),
      );
    this.disconnect(id);
    return 1;
  }

  private disconnect(id: string): void {
    for (const close of this.connections.get(id) ?? []) close();
    this.connections.delete(id);
  }
}
