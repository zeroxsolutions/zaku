import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFigmaRest } from '../adapters/figma-rest.js';
import { saveLibrary } from './save-library.js';

describe('saveLibrary', () => {
  it('writes library.json with the library file version', async () => {
    const root = await mkdtemp(join(tmpdir(), 'zaku-'));
    await writeFile(
      join(root, 'zaku.yaml'),
      'product: acme\ndesignSystem: { shadcn: { preset: x } }\nfigma: { library: LIB, product: PROD }\ntargets:\n  - { id: web-desktop, family: web, name: Desktop }\n',
    );
    const rest = createFigmaRest({
      token: 't',
      fetch: async (url) =>
        new Response(
          JSON.stringify(
            String(url).endsWith('/component_sets')
              ? { meta: { component_sets: [] } }
              : String(url).endsWith('/components')
                ? { meta: { components: [] } }
                : {
                    version: '77',
                    document: { id: '0:0', name: 'D', type: 'DOCUMENT', children: [] },
                    components: {},
                    componentSets: {},
                    styles: {},
                  },
          ),
        ),
    });
    const part = {
      exportedAt: '2026-10-07T00:00:00.000Z',
      variables: {},
      textStyles: [],
      tokens: [{ combo: { semantic: 'Light' }, values: { 'color/primary': '#007a55ff' } }],
    };
    const snapshot = await saveLibrary({ root, part, rest });
    expect(snapshot.version).toBe('77');
    expect(JSON.parse(await readFile(join(root, 'library.json'), 'utf8')).tokens[0].values['color/primary']).toEqual({
      r: 0,
      g: 0.4784,
      b: 0.3333,
      a: 1,
    });
  });
});
