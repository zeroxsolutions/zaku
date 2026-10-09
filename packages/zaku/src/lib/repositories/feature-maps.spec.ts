import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { indexTitles, loadMaps } from './feature-maps.js';

async function mapsDir(files: Record<string, string>): Promise<string> {
  const dir = join(await mkdtemp(join(tmpdir(), 'zaku-')), 'map');
  await mkdir(dir);
  for (const [name, text] of Object.entries(files)) await writeFile(join(dir, name), text);
  return dir;
}

describe('loadMaps', () => {
  it('reads every map in name order with a digest of its text', async () => {
    const dir = await mapsDir({
      'trips.yaml': 'feature: trips\nscreens:\n  trips:\n    title: Trips\n    root: true\n    states: [Default]\n',
      'auth.yaml': 'feature: auth\nscreens:\n  sign-in:\n    title: Sign in\n    root: true\n    states: [Default]\n',
    });
    const { maps, errors } = await loadMaps(dir);
    expect(errors).toEqual([]);
    expect(maps.map((m) => m.map.feature)).toEqual(['auth', 'trips']);
    expect(maps[0]?.digest).toMatch(/^[0-9a-f]{64}$/);
  });

  it('reports a file whose feature does not match its name', async () => {
    const dir = await mapsDir({ 'auth.yaml': 'feature: trips\nscreens: {}\n' });
    const { errors } = await loadMaps(dir);
    expect(errors[0]?.issues).toEqual(['feature: trips does not match the file name auth.yaml']);
  });

  it('returns no maps for a directory that does not exist', async () => {
    expect(await loadMaps(join(tmpdir(), 'zaku-no-such-dir'))).toEqual({ maps: [], errors: [] });
  });
});

describe('indexTitles', () => {
  it('reports a title two screens of one feature share, which their frame names could not tell apart', async () => {
    const dir = await mapsDir({
      'a.yaml':
        'feature: a\nscreens:\n  x:\n    title: Home\n    root: true\n    states: [Default]\n  y:\n    title: Home\n    root: true\n    states: [Default]\n',
      'b.yaml': 'feature: b\nscreens:\n  z:\n    title: Home\n    root: true\n    states: [Default]\n',
    });
    const { maps } = await loadMaps(dir);
    expect(indexTitles(maps).duplicates).toEqual(['a: Home']);
  });
});
