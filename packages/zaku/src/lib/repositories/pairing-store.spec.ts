import { createHash } from 'node:crypto';
import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FilePairingStore, pairingsPath } from './pairing-store.js';

async function store(): Promise<{ store: FilePairingStore; path: string }> {
  const path = join(await mkdtemp(join(tmpdir(), 'zaku-')), 'zaku', 'pairings.json');
  let id = 0;
  return {
    store: new FilePairingStore(
      path,
      () => new Date('2026-10-09T10:00:00.000Z'),
      () => `p${++id}`,
    ),
    path,
  };
}

describe('pairingsPath', () => {
  it('uses XDG_CONFIG_HOME, then the platform config directory', () => {
    expect(pairingsPath({ XDG_CONFIG_HOME: '/c' }, 'darwin', '/h')).toBe('/c/zaku/pairings.json');
    expect(pairingsPath({}, 'darwin', '/h')).toBe('/h/Library/Application Support/zaku/pairings.json');
    expect(pairingsPath({ APPDATA: '/a' }, 'win32', '/h')).toBe(join('/a', 'zaku', 'pairings.json'));
    expect(pairingsPath({}, 'linux', '/h')).toBe('/h/.config/zaku/pairings.json');
  });
});

describe('the pairing store', () => {
  it('finds a pairing by its token, and knows no other token', async () => {
    const { store: pairings } = await store();
    const added = await pairings.add('token-a', 'Ant Design');
    expect(added).toEqual({ id: 'p1', file: 'Ant Design', created: '2026-10-09T10:00:00.000Z' });
    expect(await pairings.find('token-a')).toEqual(added);
    expect(await pairings.find('token-b')).toBeNull();
  });

  it('keeps only a SHA-256 hash of the token, in a file only its owner can read', async () => {
    const { store: pairings, path } = await store();
    await pairings.add('token-a', 'A');
    const text = await readFile(path, 'utf8');
    expect(text).not.toContain('token-a');
    expect(text).toContain(createHash('sha256').update('token-a').digest('hex'));
    expect((await stat(path)).mode & 0o777).toBe(0o600);
  });

  it('lists every pairing, and revokes one by id or all of them', async () => {
    const { store: pairings } = await store();
    await pairings.add('token-a', 'A');
    await pairings.add('token-b', 'B');
    expect((await pairings.list()).map((p) => p.file)).toEqual(['A', 'B']);
    expect(await pairings.revoke('p1')).toBe(true);
    expect(await pairings.revoke('p1')).toBe(false);
    expect(await pairings.find('token-a')).toBeNull();
    expect(await pairings.revokeAll()).toBe(1);
    expect(await pairings.list()).toEqual([]);
  });

  it('reads a missing or unreadable file as no pairings', async () => {
    const { store: pairings, path } = await store();
    expect(await pairings.list()).toEqual([]);
    await pairings.add('token-a', 'A');
    await writeFile(path, '{not json');
    expect(await pairings.find('token-a')).toBeNull();
  });
});
