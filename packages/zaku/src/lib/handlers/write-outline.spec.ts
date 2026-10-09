import { access, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse, stringify } from 'yaml';
import { createFigmaRest } from '../adapters/figma-rest.js';
import { runOutline } from './write-outline.js';

const FRAME = 'Trips / Default / Desktop';

const top = {
  version: '42',
  document: {
    id: '0:0',
    name: 'Document',
    type: 'DOCUMENT',
    children: [
      {
        id: '0:1',
        name: 'Trips',
        type: 'CANVAS',
        flowStartingPoints: [{ nodeId: '1:1', name: 'Trips' }],
        children: [
          {
            id: '5:1',
            name: 'Trips',
            type: 'SECTION',
            children: [
              {
                id: '5:2',
                name: 'Default',
                type: 'SECTION',
                children: [{ id: '1:1', name: FRAME, type: 'FRAME' }],
              },
            ],
          },
          { id: '1:2', name: 'Trps / Default / Desktop', type: 'FRAME' },
          { id: '9:9', name: 'Notes', type: 'FRAME' },
        ],
      },
    ],
  },
  components: {},
  componentSets: {},
  styles: {},
};

const nodes = {
  version: '42',
  nodes: {
    '1:1': {
      document: {
        id: '1:1',
        name: FRAME,
        type: 'FRAME',
        absoluteBoundingBox: { x: 0, y: 0, width: 1440, height: 900 },
        children: [],
      },
      components: {},
      componentSets: {},
      styles: {},
    },
  },
};

const MAP = 'feature: trips\nscreens:\n  trips:\n    title: Trips\n    root: true\n    states: [Default]\n';

async function design(): Promise<string> {
  const root = join(await mkdtemp(join(tmpdir(), 'zaku-')), 'design');
  await mkdir(join(root, 'map'), { recursive: true });
  await writeFile(
    join(root, 'zaku.yaml'),
    'product: acme\ndesignSystem: { shadcn: { preset: x } }\nfigma: { library: LIB, product: PROD }\ntargets:\n  - { id: web-desktop, family: web, name: Desktop }\n',
  );
  await writeFile(join(root, 'map', 'trips.yaml'), MAP);
  return root;
}

function fakeFetch(log: string[]): typeof fetch {
  return async (url) => {
    const href = String(url);
    log.push(href);
    return new Response(JSON.stringify(href.includes('/nodes?') ? nodes : top), { status: 200 });
  };
}

describe('runOutline', () => {
  it('writes the outline of every mapped frame and lists a frame whose title no map knows', async () => {
    const root = await design();
    const log: string[] = [];
    const summary = await runOutline({
      root,
      rest: createFigmaRest({ token: 't', fetch: fakeFetch(log) }),
      frames: null,
    });
    expect(summary).toEqual({
      skipped: false,
      read: 1,
      written: [join(root, 'outline', 'trips', 'trips.yaml')],
      unmapped: 1,
    });
    const outline = parse(await readFile(join(root, 'outline', 'trips', 'trips.yaml'), 'utf8'));
    expect(outline.source).toBe('PROD');
    expect(outline.fileVersion).toBe('42');
    expect(outline.frames[0]).toMatchObject({
      name: FRAME,
      state: 'Default',
      target: 'web-desktop',
      containers: ['Trips', 'Default'],
      start: true,
    });
    const unmapped = parse(await readFile(join(root, 'outline', 'unmapped.yaml'), 'utf8'));
    expect(unmapped.frames).toEqual([{ nodeId: '1:2', name: 'Trps / Default / Desktop' }]);
    expect(log).toEqual([
      'https://api.figma.com/v1/files/PROD?depth=4',
      `https://api.figma.com/v1/files/PROD/nodes?ids=${encodeURIComponent('1:1')}`,
    ]);
  });

  it('skips the node read when the file version and every map are unchanged, and rereads after a map edit', async () => {
    const root = await design();
    await runOutline({
      root,
      rest: createFigmaRest({ token: 't', fetch: fakeFetch([]) }),
      frames: null,
    });
    const again: string[] = [];
    expect(
      (
        await runOutline({
          root,
          rest: createFigmaRest({ token: 't', fetch: fakeFetch(again) }),
          frames: null,
        })
      ).skipped,
    ).toBe(true);
    expect(again).toEqual(['https://api.figma.com/v1/files/PROD?depth=4']);
    await writeFile(join(root, 'map', 'trips.yaml'), MAP.replace('[Default]', '[Default, Empty]'));
    const edited: string[] = [];
    expect(
      (
        await runOutline({
          root,
          rest: createFigmaRest({ token: 't', fetch: fakeFetch(edited) }),
          frames: null,
        })
      ).skipped,
    ).toBe(false);
    expect(edited).toHaveLength(2);
  });
});

describe('runOutline, on an outline nothing draws any more', () => {
  it('rereads and deletes the outline of a screen no frame resolves to', async () => {
    const root = await design();
    const rest = createFigmaRest({ token: 't', fetch: fakeFetch([]) });
    await runOutline({ root, rest, frames: null });
    const kept = parse(await readFile(join(root, 'outline', 'trips', 'trips.yaml'), 'utf8'));
    const stale = join(root, 'outline', 'trips', 'old.yaml');
    await writeFile(stale, stringify({ ...kept, screen: 'old', frames: [] }));
    const summary = await runOutline({ root, rest, frames: null });
    expect(summary.skipped).toBe(false);
    await expect(access(stale)).rejects.toThrow();
  });
});

describe('runOutline, frames that resolve badly', () => {
  async function designWith(maps: Record<string, string>): Promise<string> {
    const root = await design();
    for (const [name, text] of Object.entries(maps)) await writeFile(join(root, 'map', name), text);
    return root;
  }

  function fetchFor(children: unknown[], log: string[] = []): typeof fetch {
    const file = { ...top, document: { ...top.document, children } };
    return async (url) => {
      log.push(String(url));
      return new Response(JSON.stringify(String(url).includes('/nodes?') ? nodes : file), {
        status: 200,
      });
    };
  }

  it('lists a frame named with slashes that does not parse, so a typo in a target name is seen', async () => {
    const root = await design();
    const page = {
      id: '0:1',
      name: 'Trips',
      type: 'CANVAS',
      children: [
        { id: '1:5', name: 'Trips / Default / Desktpo', type: 'FRAME' },
        { id: '1:6', name: 'Trips/Default/Desktop', type: 'FRAME' },
      ],
    };
    await runOutline({
      root,
      rest: createFigmaRest({ token: 't', fetch: fetchFor([page]) }),
      frames: null,
    });
    const unmapped = parse(await readFile(join(root, 'outline', 'unmapped.yaml'), 'utf8'));
    expect(unmapped.frames.map((frame: { nodeId: string }) => frame.nodeId)).toEqual(['1:5', '1:6']);
  });

  it('does not give a frame on a feature page to another feature that shares its title', async () => {
    const root = await designWith({
      'account.yaml':
        'feature: account\nscreens:\n  settings:\n    title: Settings\n    root: true\n    states: [Default]\n',
    });
    const page = {
      id: '0:1',
      name: 'Trips',
      type: 'CANVAS',
      children: [{ id: '1:7', name: 'Settings / Default / Desktop', type: 'FRAME' }],
    };
    await runOutline({
      root,
      rest: createFigmaRest({ token: 't', fetch: fetchFor([page]) }),
      frames: null,
    });
    const unmapped = parse(await readFile(join(root, 'outline', 'unmapped.yaml'), 'utf8'));
    expect(unmapped.frames).toEqual([{ nodeId: '1:7', name: 'Settings / Default / Desktop' }]);
  });

  it('rereads when a new map makes a frame resolve, though the file version did not move', async () => {
    const root = await design();
    const pages = [
      top.document.children[0],
      {
        id: '0:2',
        name: 'Account',
        type: 'CANVAS',
        children: [{ id: '1:8', name: 'Settings / Default / Desktop', type: 'FRAME' }],
      },
    ];
    await runOutline({
      root,
      rest: createFigmaRest({ token: 't', fetch: fetchFor(pages) }),
      frames: null,
    });
    await writeFile(
      join(root, 'map', 'account.yaml'),
      'feature: account\nscreens:\n  settings:\n    title: Settings\n    root: true\n    states: [Default]\n',
    );
    const log: string[] = [];
    expect(
      (
        await runOutline({
          root,
          rest: createFigmaRest({ token: 't', fetch: fetchFor(pages, log) }),
          frames: null,
        })
      ).skipped,
    ).toBe(false);
  });
});
