import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stringify } from 'yaml';
import { loadOutlines, outlinePath } from './outlines.js';
import type { ScreenOutline } from '../domain/outline.js';

const outline: ScreenOutline = {
  feature: 'auth',
  screen: 'sign-in',
  source: 'P',
  fileVersion: '123',
  mapDigest: 'abc',
  libraryVersion: null,
  frames: [
    {
      nodeId: '1:2',
      name: 'Sign in / Default / Desktop',
      target: 'web-desktop',
      state: 'Default',
      size: { width: 1440, height: 900 },
      containers: ['Sign in', 'Default'],
      start: false,
      instances: [],
      texts: [],
      raw: [],
      images: [],
      defaultNames: [],
      links: [],
    },
  ],
};

describe('loadOutlines', () => {
  it('reads every screen outline under its feature, and the unmapped list', async () => {
    const dir = join(await mkdtemp(join(tmpdir(), 'zaku-')), 'outline');
    await mkdir(join(dir, 'auth'), { recursive: true });
    await writeFile(outlinePath(dir, 'auth', 'sign-in'), stringify(outline));
    await writeFile(
      join(dir, 'unmapped.yaml'),
      stringify({
        fileVersion: '123',
        frames: [{ nodeId: '9:9', name: 'Hoem / Default / Desktop' }],
      }),
    );
    const loaded = await loadOutlines(dir);
    expect(loaded.errors).toEqual([]);
    expect(loaded.outlines).toEqual([outline]);
    expect(loaded.unmapped?.frames).toEqual([{ nodeId: '9:9', name: 'Hoem / Default / Desktop' }]);
  });

  it('reports an outline file that does not match its schema', async () => {
    const dir = join(await mkdtemp(join(tmpdir(), 'zaku-')), 'outline');
    await mkdir(join(dir, 'auth'), { recursive: true });
    await writeFile(outlinePath(dir, 'auth', 'sign-in'), 'feature: auth\n');
    expect((await loadOutlines(dir)).errors).toHaveLength(1);
  });
});
