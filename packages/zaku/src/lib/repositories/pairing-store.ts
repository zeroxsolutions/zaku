import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { z } from 'zod';

/** A plugin the user paired; the token it was given never leaves the plugin, only its hash is kept. */
export const pairingSchema = z
  .object({
    id: z.string().describe('The id unpair takes'),
    file: z.string().describe('The Figma file the plugin said hello from when it paired'),
    created: z.string().describe('When it paired, ISO 8601'),
  })
  .strict();

export type Pairing = z.output<typeof pairingSchema>;

const pairingsFileSchema = z
  .object({ pairings: z.array(pairingSchema.extend({ hash: z.string() }).strict()) })
  .strict();

type PairingsFile = z.output<typeof pairingsFileSchema>;

export function pairingsPath(env: Record<string, string | undefined>, platform: string, home: string): string {
  const config =
    env['XDG_CONFIG_HOME'] ??
    (platform === 'darwin'
      ? join(home, 'Library', 'Application Support')
      : platform === 'win32'
        ? (env['APPDATA'] ?? join(home, 'AppData', 'Roaming'))
        : join(home, '.config'));
  return join(config, 'zaku', 'pairings.json');
}

const hashOf = (token: string): string => createHash('sha256').update(token).digest('hex');

export interface IPairingStore {
  add(token: string, file: string): Promise<Pairing>;
  /** Null for a token no pairing was issued, or one since revoked. */
  find(token: string): Promise<Pairing | null>;
  list(): Promise<Pairing[]>;
  /** False when no pairing has the id. */
  revoke(id: string): Promise<boolean>;
  /** How many pairings it removed. */
  revokeAll(): Promise<number>;
}

/** The pairings file under the user's config directory, readable and writable by its owner alone. */
export class FilePairingStore implements IPairingStore {
  constructor(
    private readonly path: string,
    private readonly now: () => Date = () => new Date(),
    private readonly nextId: () => string = randomUUID,
  ) {}

  async add(token: string, file: string): Promise<Pairing> {
    const stored = await this.read();
    const pairing = { id: this.nextId(), file, created: this.now().toISOString() };
    stored.pairings.push({ ...pairing, hash: hashOf(token) });
    await this.write(stored);
    return pairing;
  }

  async find(token: string): Promise<Pairing | null> {
    const hash = hashOf(token);
    const found = (await this.read()).pairings.find((entry) => entry.hash === hash);
    return found ? { id: found.id, file: found.file, created: found.created } : null;
  }

  async list(): Promise<Pairing[]> {
    return (await this.read()).pairings.map(({ id, file, created }) => ({ id, file, created }));
  }

  async revoke(id: string): Promise<boolean> {
    const stored = await this.read();
    const kept = stored.pairings.filter((entry) => entry.id !== id);
    if (kept.length === stored.pairings.length) return false;
    await this.write({ pairings: kept });
    return true;
  }

  async revokeAll(): Promise<number> {
    const { pairings } = await this.read();
    await this.write({ pairings: [] });
    return pairings.length;
  }

  private async read(): Promise<PairingsFile> {
    try {
      const parsed = pairingsFileSchema.safeParse(JSON.parse(await readFile(this.path, 'utf8')));
      if (parsed.success) return parsed.data;
    } catch {
      // Missing or not JSON: every token reads as unknown, and the plugin pairs again.
    }
    return { pairings: [] };
  }

  private async write(stored: PairingsFile): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    const temporary = `${this.path}.${process.pid}.tmp`;
    await writeFile(temporary, `${JSON.stringify(stored, null, 2)}\n`, { mode: 0o600 });
    await rename(temporary, this.path);
  }
}
