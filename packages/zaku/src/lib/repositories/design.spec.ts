import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadDesign } from './design.js';

const config = [
  'product: acme',
  'designSystem: { shadcn: { preset: aCm3pr3s7 } }',
  'figma: { library: LIB, product: PROD }',
  'targets:',
  '  - { id: web-desktop, family: web, name: Desktop }',
  '',
].join('\n');

async function design(files: Record<string, string>): Promise<string> {
  const root = join(await mkdtemp(join(tmpdir(), 'zaku-')), 'design');
  for (const [name, text] of Object.entries(files)) {
    await mkdir(join(root, name, '..'), { recursive: true });
    await writeFile(join(root, name), text);
  }
  return root;
}

describe('loadDesign', () => {
  it('returns no input and one schema finding when zaku.yaml is invalid', async () => {
    const root = await design({ 'zaku.yaml': 'product: acme\n' });
    const loaded = await loadDesign(root);
    expect(loaded.input).toBeNull();
    expect(loaded.findings[0]?.check).toBe('schema');
  });

  it('keeps going past an invalid map and reports it as a schema finding', async () => {
    const root = await design({
      'zaku.yaml': config,
      'map/auth.yaml': 'feature: auth\nscreens:\n  a:\n    title: A\n    root: true\n    states: [Default]\n',
      'map/trips.yaml': 'feature: trips\nscreens: { x: { title: X } }\n',
    });
    const loaded = await loadDesign(root);
    expect(loaded.input?.maps.map((m) => m.map.feature)).toEqual(['auth']);
    expect(loaded.findings.map((f) => f.check)).toEqual(['schema']);
  });

  it('reports a screen title two screens of one feature share', async () => {
    const screen = (id: string): string => `  ${id}:\n    title: Home\n    root: true\n    states: [Default]\n`;
    const root = await design({
      'zaku.yaml': config,
      'map/a.yaml': `feature: a\nscreens:\n${screen('one')}${screen('two')}`,
    });
    const loaded = await loadDesign(root);
    expect(loaded.findings).toEqual([
      {
        check: 'schema',
        feature: 'a',
        message: 'two screens share the title Home; a frame name could not tell them apart',
      },
    ]);
  });

  it('accepts one title in two features, since each feature has its own page', async () => {
    const one = 'screens:\n  a:\n    title: Home\n    root: true\n    states: [Default]\n';
    const root = await design({
      'zaku.yaml': config,
      'map/a.yaml': `feature: a\n${one}`,
      'map/b.yaml': `feature: b\n${one}`,
    });
    expect((await loadDesign(root)).findings).toEqual([]);
  });
});
