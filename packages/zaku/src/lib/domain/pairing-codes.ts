import { randomInt } from 'node:crypto';
import type { RefusalReason } from '../schema/bridge.js';

export const CODE_LIFETIME_MS = 5 * 60_000;
/** Wrong attempts, counted across every connection, that void the live code. */
export const CODE_ATTEMPTS = 5;

export type Redeemed = { kind: 'paired' } | { kind: 'refused'; reason: Exclude<RefusalReason, 'unknown-token'> };

export type CodeStatus =
  | { state: 'none' }
  | { state: 'live'; expiresAt: number; attemptsLeft: number }
  | { state: 'used-up' };

type Live = { state: 'live'; code: string; expiresAt: number; attemptsLeft: number };

/** Eight digits from a cryptographic source; a guess at one is 1 in 10^8. */
export function drawCode(): string {
  return String(randomInt(0, 100_000_000)).padStart(8, '0');
}

/** The code as the agent shows it, `1234 5678`. */
export function displayCode(code: string): string {
  return `${code.slice(0, 4)} ${code.slice(4)}`;
}

/** The one live pairing code: single use, five minutes long, and void after five wrong attempts. */
export class PairingCodes {
  private current: Live | { state: 'none' } | { state: 'used-up' } = { state: 'none' };

  constructor(
    private readonly now: () => number,
    private readonly draw: () => string = drawCode,
  ) {}

  /** Replaces whatever code was live, so only the newest one pairs. */
  issue(): { code: string; expiresAt: number } {
    const code = this.draw();
    const expiresAt = this.now() + CODE_LIFETIME_MS;
    this.current = { state: 'live', code, expiresAt, attemptsLeft: CODE_ATTEMPTS };
    return { code, expiresAt };
  }

  redeem(code: string): Redeemed {
    const current = this.live();
    if (current.state === 'used-up') return { kind: 'refused', reason: 'used-up-code' };
    if (current.state === 'none') return { kind: 'refused', reason: 'expired-code' };
    if (code === current.code) {
      this.current = { state: 'none' };
      return { kind: 'paired' };
    }
    current.attemptsLeft -= 1;
    if (current.attemptsLeft > 0) return { kind: 'refused', reason: 'wrong-code' };
    this.current = { state: 'used-up' };
    return { kind: 'refused', reason: 'used-up-code' };
  }

  status(): CodeStatus {
    const current = this.live();
    if (current.state !== 'live') return current;
    return { state: 'live', expiresAt: current.expiresAt, attemptsLeft: current.attemptsLeft };
  }

  private live(): PairingCodes['current'] {
    if (this.current.state === 'live' && this.now() >= this.current.expiresAt) this.current = { state: 'none' };
    return this.current;
  }
}
