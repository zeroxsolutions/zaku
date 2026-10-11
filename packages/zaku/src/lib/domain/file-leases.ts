import { FileHeldByAnotherSession } from './errors/index.js';

/** An agent session connected to the hub: its id, and the directory it works in, which a refusal names. */
export interface LeaseClient {
  id: string;
  cwd: string;
}

export interface Lease {
  client: LeaseClient;
  lastWrite: number;
}

/** How long a lease outlives its last write; a session that stopped drawing gives the file up. */
export const LEASE_IDLE_MS = 15 * 60_000;

/**
 * Which session writes each file. Two sessions drawing one file undo each other's work and each reads the other's
 * nodes as its own, so a file has one writer; reads are not leased.
 */
export class FileLeases<K> {
  private readonly leases = new Map<K, Lease>();

  constructor(
    private readonly now: () => number,
    private readonly idleMs: number = LEASE_IDLE_MS,
  ) {}

  /**
   * Takes or renews the lease for a write.
   * @throws FileHeldByAnotherSession when another client holds the file
   */
  write(key: K, file: string, client: LeaseClient): void {
    const lease = this.holder(key);
    if (lease && lease.client.id !== client.id)
      throw new FileHeldByAnotherSession(file, lease.client.cwd, lease.lastWrite);
    this.leases.set(key, { client, lastWrite: this.now() });
  }

  /** Gives the file to the client whose pairing code it paired with, before either session writes it. */
  grant(key: K, client: LeaseClient): void {
    this.leases.set(key, { client, lastWrite: this.now() });
  }

  holder(key: K): Lease | null {
    const lease = this.leases.get(key);
    if (!lease) return null;
    if (this.now() - lease.lastWrite > this.idleMs) {
      this.leases.delete(key);
      return null;
    }
    return lease;
  }

  /** Ends every lease a client held, when it disconnects. */
  release(clientId: string): void {
    for (const [key, lease] of this.leases) if (lease.client.id === clientId) this.leases.delete(key);
  }

  /** Forgets a file whose panel disconnected. */
  drop(key: K): void {
    this.leases.delete(key);
  }
}
