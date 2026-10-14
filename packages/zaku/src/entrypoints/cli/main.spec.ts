import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as playwright from 'playwright';
import { main, runners, type CliIo } from './main.js';

export function captureIo(cwd: string, extra: Partial<CliIo> = {}): CliIo & { lines: string[]; errors: string[] } {
  const lines: string[] = [];
  const errors: string[] = [];
  return {
    out: (line) => lines.push(line),
    err: (line) => errors.push(line),
    env: {},
    cwd,
    lines,
    errors,
    ...extra,
  };
}

describe('main', () => {
  it('answers an unknown command with usage and exit 3', async () => {
    const io = captureIo(process.cwd());
    expect(await main(['paint'], io)).toBe(3);
    expect(io.errors.join('\n')).toContain('usage: zaku <check|outline|tokens|recipe|library|rules|budget|schema>');
  });

  it('answers an unknown option with usage and exit 3', async () => {
    const io = captureIo(process.cwd());
    expect(await main(['schema', '--colour'], io)).toBe(3);
    expect(io.errors.join('\n')).toContain('--colour');
  });

  it('writes the JSON Schemas into the directory it is given', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'zaku-'));
    const io = captureIo(dir);
    expect(await main(['schema', '--out', dir], io)).toBe(0);
    const written = JSON.parse(await readFile(join(dir, 'zaku.schema.json'), 'utf8'));
    expect(written.type).toBe('object');
  });
});

describe('zaku check', () => {
  it('prints the report and exits 1 when a check finds something', async () => {
    const root = join(await mkdtemp(join(tmpdir(), 'zaku-')), 'design');
    await mkdir(join(root, 'map'), { recursive: true });
    await writeFile(
      join(root, 'zaku.yaml'),
      'product: acme\ndesignSystem: { shadcn: { preset: x } }\nfigma: { library: L, product: P }\ntargets:\n  - { id: web-desktop, family: web, name: Desktop }\n',
    );
    await writeFile(
      join(root, 'map', 'auth.yaml'),
      'feature: auth\nscreens:\n  a:\n    title: A\n    states: [Default]\n',
    );
    const io = captureIo(root);
    expect(await main(['check', '--root', root], io)).toBe(1);
    expect(io.lines.at(-1)).toMatch(/^zaku check: \d+ findings, \d+ not run, \d+ passed$/);
    expect(io.lines).toContain('FAIL reachability auth/a entry: a screen that is not a root has no entry');
  });

  it('prints the report as JSON with --json', async () => {
    const root = join(await mkdtemp(join(tmpdir(), 'zaku-')), 'design');
    await mkdir(root, { recursive: true });
    await writeFile(join(root, 'zaku.yaml'), 'product: acme\n');
    const io = captureIo(root);
    expect(await main(['check', '--root', root, '--json'], io)).toBe(1);
    expect(JSON.parse(io.lines.join('\n')).findings[0].check).toBe('schema');
  });
});

describe('zaku tokens', () => {
  it('decodes the preset, reads the stylesheet and writes tokens.json', async () => {
    const root = join(await mkdtemp(join(tmpdir(), 'zaku-')), 'design');
    await mkdir(root, { recursive: true });
    await writeFile(
      join(root, 'zaku.yaml'),
      'product: acme\ndesignSystem: { shadcn: { preset: aCm3pr3s7 } }\nfigma: { library: L, product: P }\ntargets:\n  - { id: web-desktop, family: web, name: Desktop }\n',
    );
    await writeFile(
      join(root, 'global.css'),
      ':root {\n  --primary: oklch(0.508 0.118 165.612);\n  --radius: 0.625rem;\n}\n',
    );
    const saved = runners.run;
    runners.run = async (): Promise<string> => '  code  aCm3pr3s7\n  theme emerald\n';
    try {
      const io = captureIo(root);
      expect(await main(['tokens', '--root', root, '--css', join(root, 'global.css')], io)).toBe(0);
      expect(io.lines).toEqual([`wrote ${join(root, 'tokens.json')}: 1 colours, preset aCm3pr3s7`]);
      expect(JSON.parse(await readFile(join(root, 'tokens.json'), 'utf8')).description).toBe(
        'shadcn preset aCm3pr3s7: theme emerald',
      );
    } finally {
      runners.run = saved;
    }
  });

  it('is a usage error without --css on a shadcn design system', async () => {
    const root = await mkdtemp(join(tmpdir(), 'zaku-'));
    await writeFile(
      join(root, 'zaku.yaml'),
      'product: acme\ndesignSystem: { shadcn: { preset: x } }\nfigma: { library: L, product: P }\ntargets:\n  - { id: web-desktop, family: web, name: Desktop }\n',
    );
    const io = captureIo(root);
    expect(await main(['tokens', '--root', root], io)).toBe(3);
    expect(io.errors).toEqual(['zaku tokens needs --css, the stylesheet that declares :root and .dark']);
  });

  it('reads the DTCG token files a design system ships, from the repository root, with no --css', async () => {
    const repo = await mkdtemp(join(tmpdir(), 'zaku-'));
    const root = join(repo, 'docs', 'design');
    await mkdir(root, { recursive: true });
    await mkdir(join(repo, 'tokens'));
    await writeFile(
      join(root, 'zaku.yaml'),
      'product: acme\ndesignSystem: { dtcg: { light: [tokens/light.json], dark: [tokens/dark.json] } }\nfigma: { library: L, product: P }\ntargets:\n  - { id: web-desktop, family: web, name: Desktop }\n',
    );
    await writeFile(
      join(repo, 'tokens', 'light.json'),
      JSON.stringify({ color: { $type: 'color', primary: { $value: '#007a55' } } }),
    );
    await writeFile(
      join(repo, 'tokens', 'dark.json'),
      JSON.stringify({ color: { $type: 'color', primary: { $value: '#006045' } } }),
    );
    const io = captureIo(repo);
    expect(await main(['tokens', '--root', root], io)).toBe(0);
    expect(io.lines).toEqual([`wrote ${join(root, 'tokens.json')}: 1 colours, from DTCG`]);
    expect(
      JSON.parse(await readFile(join(root, 'tokens.json'), 'utf8')).modifiers.scheme.contexts.dark[0].color.primary
        .$value.hex,
    ).toBe('#006045');
  });
});

describe('zaku budget', () => {
  it('records calls and exits 4 once the run ceiling is reached', async () => {
    const cache = await mkdtemp(join(tmpdir(), 'zaku-'));
    const io = captureIo(cache, { env: { XDG_CACHE_HOME: cache, ZAKU_RUN: 'r', ZAKU_SEAT: 's' } });
    expect(await main(['budget', 'record', '--kind', 'mcp', '--count', '30'], io)).toBe(0);
    expect(await main(['budget', 'status'], io)).toBe(4);
    expect(io.lines.at(-1)).toBe('mcp 30 today, 30 this run: this run reached its ceiling of 30 MCP calls');
  });

  it('is a usage error with a kind it does not know, or no action', async () => {
    const cache = await mkdtemp(join(tmpdir(), 'zaku-'));
    const io = captureIo(cache, { env: { XDG_CACHE_HOME: cache } });
    expect(await main(['budget', 'record', '--kind', 'paint', '--count', '1'], io)).toBe(3);
    expect(await main(['budget'], io)).toBe(3);
  });
});

describe('zaku budget and library save, against the ledger', () => {
  it('refuses an invalid zaku.yaml rather than counting against the default budget', async () => {
    const root = await mkdtemp(join(tmpdir(), 'zaku-'));
    await writeFile(join(root, 'zaku.yaml'), 'product: acme\nbudget: { mcpPerDay: many }\n');
    const io = captureIo(root, { env: { XDG_CACHE_HOME: root } });
    expect(await main(['budget', 'status', '--root', root], io)).toBe(1);
    expect(io.errors).toHaveLength(1);
  });

  it('counts the REST calls library save made, even when one fails', async () => {
    const root = await mkdtemp(join(tmpdir(), 'zaku-'));
    await writeFile(
      join(root, 'zaku.yaml'),
      'product: acme\ndesignSystem: { shadcn: { preset: x } }\nfigma: { library: L, product: P }\ntargets:\n  - { id: web-desktop, family: web, name: Desktop }\n',
    );
    await writeFile(
      join(root, 'variables.json'),
      JSON.stringify({
        exportedAt: '2026-10-08T00:00:00.000Z',
        variables: {},
        textStyles: [],
        tokens: [],
      }),
    );
    const fetch = (async () => new Response('down', { status: 500 })) as typeof globalThis.fetch;
    const io = captureIo(root, {
      env: { XDG_CACHE_HOME: root, FIGMA_TOKEN: 't', ZAKU_SEAT: 's', ZAKU_RUN: 'r' },
      fetch,
    });
    expect(await main(['library', 'save', '--root', root, '--input', join(root, 'variables.json')], io)).toBe(1);
    const ledger = JSON.parse(await readFile(join(root, 'zaku', 'ledger.json'), 'utf8'));
    expect(ledger.seats.s.rest).toBe(1);
  });
});

describe('zaku library save', () => {
  it('refuses a library it read no component from, naming --local', async () => {
    const root = await mkdtemp(join(tmpdir(), 'zaku-'));
    await writeFile(
      join(root, 'zaku.yaml'),
      'product: acme\ndesignSystem: { shadcn: { preset: x } }\nfigma: { library: P, product: P }\ntargets:\n  - { id: web-desktop, family: web, name: Desktop }\n',
    );
    await writeFile(
      join(root, 'variables.json'),
      JSON.stringify({ exportedAt: '2026-10-14T00:00:00.000Z', variables: {}, textStyles: [], tokens: [] }),
    );
    const fetch = (async (url: string | URL | Request) =>
      new Response(
        JSON.stringify(
          String(url).endsWith('/component_sets')
            ? { meta: { component_sets: [] } }
            : String(url).endsWith('/components')
              ? { meta: { components: [] } }
              : {
                  version: '1',
                  document: { id: '0:0', name: 'D', type: 'DOCUMENT', children: [] },
                  components: {},
                  componentSets: {},
                  styles: {},
                },
        ),
        { status: 200 },
      )) as typeof globalThis.fetch;
    const io = captureIo(root, {
      env: { XDG_CACHE_HOME: root, FIGMA_TOKEN: 't', ZAKU_SEAT: 's', ZAKU_RUN: 'r' },
      fetch,
    });
    expect(await main(['library', 'save', '--root', root, '--input', join(root, 'variables.json')], io)).toBe(1);
    expect(io.errors.join('\n')).toContain('zaku library script --local');
  });
});

describe('zaku outline', () => {
  it('needs FIGMA_TOKEN for a Figma file', async () => {
    const root = join(await mkdtemp(join(tmpdir(), 'zaku-')), 'design');
    await mkdir(root, { recursive: true });
    await writeFile(
      join(root, 'zaku.yaml'),
      'product: acme\ndesignSystem: { shadcn: { preset: x } }\nfigma: { library: L, product: P }\ntargets:\n  - { id: web-desktop, family: web, name: Desktop }\n',
    );
    const io = captureIo(root);
    expect(await main(['outline', '--root', root], io)).toBe(3);
    expect(io.errors).toContain('zaku outline needs FIGMA_TOKEN, a Figma personal access token with file read access');
  });
});

describe('errors', () => {
  it('prints one line, no stack, and exits 1 when zaku.yaml is missing or an input is invalid', async () => {
    const root = await mkdtemp(join(tmpdir(), 'zaku-'));
    const io = captureIo(root);
    expect(await main(['tokens', '--root', root, '--css', 'x.css'], io)).toBe(1);
    expect(io.errors).toHaveLength(1);
    expect(io.errors[0]).toMatch(/^zaku: /);
    expect(io.errors[0]).not.toMatch(/\n\s+at /);
  });

  it('exits 0 for --help', async () => {
    expect(await main(['--help'], captureIo(process.cwd()))).toBe(0);
  });
});

describe('zaku recipe', { timeout: 60_000 }, () => {
  const CONFIG =
    'product: acme\ndesignSystem: { shadcn: { preset: x } }\nfigma: { library: L, product: P }\ntargets:\n  - { id: web-desktop, family: web, name: Desktop }\n';
  const PAGE =
    '<style>:root{--bg:#ffffff}.dark{--bg:#09090b}button{background:var(--bg);color:#09090b;padding:0 10px}</style>' +
    '<button data-zaku-component="Button" data-zaku-props=\'{"variant":"outline"}\'><span data-zaku-part="label">Go</span></button>';

  async function design(recipe = ''): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'zaku-'));
    await writeFile(join(root, 'zaku.yaml'), CONFIG + recipe);
    return root;
  }

  async function withPlaywright<T>(module: typeof playwright | null, run: () => Promise<T>): Promise<T> {
    const saved = runners.loadPlaywright;
    runners.loadPlaywright = async (): Promise<typeof playwright | null> => module;
    try {
      return await run();
    } finally {
      runners.loadPlaywright = saved;
    }
  }

  it('reads the recipe page in light and dark and writes recipe.json', async () => {
    const root = await design();
    const io = captureIo(root);
    const url = `data:text/html,${encodeURIComponent(PAGE)}`;
    expect(await withPlaywright(playwright, () => main(['recipe', '--root', root, '--url', url], io))).toBe(0);
    expect(io.lines).toEqual([`wrote ${join(root, 'recipe.json')}: 1 components, 1 variants, in light and dark`]);
    const doc = JSON.parse(await readFile(join(root, 'recipe.json'), 'utf8'));
    expect(doc.components[0].variants.map((variant: { scheme: string }) => variant.scheme)).toEqual(['light', 'dark']);
    expect(doc.components[0].variants[1].parts.root.background).toEqual({
      r: 0.0353,
      g: 0.0353,
      b: 0.0431,
      a: 1,
    });
  });

  it('loads playwright from the product the command runs in, and nothing from elsewhere', async () => {
    const module = await runners.loadPlaywright(process.cwd());
    expect(typeof module?.chromium.launch).toBe('function');
    expect(await runners.loadPlaywright(await mkdtemp(join(tmpdir(), 'zaku-')))).toBeNull();
  });

  it('is a usage error with no recipe page named', async () => {
    const io = captureIo(await design());
    expect(await main(['recipe', '--root', io.cwd], io)).toBe(3);
    expect(io.errors).toEqual(["zaku recipe needs the product's recipe page: recipe.url in zaku.yaml, or --url"]);
  });

  it('is a usage error when the product has no playwright', async () => {
    const io = captureIo(await design('recipe: { url: "http://localhost:4200/zaku/recipe" }\n'));
    expect(await withPlaywright(null, () => main(['recipe', '--root', io.cwd], io))).toBe(3);
    expect(io.errors).toEqual([
      'zaku recipe loads playwright from the product: npm i -D playwright, then npx playwright install chromium',
    ]);
  });

  it('exits 2 naming what the page got wrong', async () => {
    const io = captureIo(await design());
    const url = `data:text/html,${encodeURIComponent('<p>nothing</p>')}`;
    expect(await withPlaywright(playwright, () => main(['recipe', '--root', io.cwd, '--url', url], io))).toBe(2);
    expect(io.errors).toEqual([`zaku recipe: ${url} marks no element with data-zaku-component`]);
  });
});

describe('zaku rules script', () => {
  const design = async (copy = ''): Promise<string> => {
    const root = join(await mkdtemp(join(tmpdir(), 'zaku-')), 'design');
    await mkdir(root, { recursive: true });
    await writeFile(
      join(root, 'zaku.yaml'),
      `product: acme\ndesignSystem: { shadcn: { preset: x } }\nfigma: { product: P }\ntargets:\n  - { id: web-desktop, family: web, name: Desktop }\n${copy}`,
    );
    return root;
  };

  it('prints the rules and one call over the page, under the copy zaku.yaml names', async () => {
    const root = await design('copy: { locales: [en, vi, ja], currencies: [VND] }\n');
    const saved = runners.rulesLibrary;
    runners.rulesLibrary = async (): Promise<string> => 'var zakuRulesLib=(()=>({zakuRules:async()=>({})}))();';
    try {
      const io = captureIo(root);
      expect(await main(['rules', 'script', '--root', root, '--page', 'Screens'], io)).toBe(0);
      const script = io.lines.join('\n');
      expect(script.startsWith('var zakuRulesLib=')).toBe(true);
      // The copy arrives resolved: the use_figma sandbox has no Intl to resolve a locale with.
      expect(script).toContain('return await zakuRulesLib.zakuRules(figma, {"scope":{"page":"Screens"},"copy":{');
      expect(script).toContain('"scripts":["Latn","Han","Hiragana","Katakana"]');
      expect(script).toContain('"languages":["en","vi","ja"]');
      expect(script).toContain('\u20ab');
    } finally {
      runners.rulesLibrary = saved;
    }
  });

  it('holds copy to English with no currency when zaku.yaml has no copy section, and needs a page or a node', async () => {
    const root = await design();
    const saved = runners.rulesLibrary;
    runners.rulesLibrary = async (): Promise<string> => '';
    try {
      const io = captureIo(root);
      expect(await main(['rules', 'script', '--root', root, '--node', '1:2'], io)).toBe(0);
      expect(io.lines.join('\n')).toContain(
        '{"scope":{"nodeId":"1:2"},"copy":{"scripts":["Latn"],"symbols":[],"languages":["en"]}}',
      );
      const none = captureIo(root);
      expect(await main(['rules', 'script', '--root', root], none)).toBe(3);
      expect(none.errors.join('\n')).toContain('zaku rules script needs --page or --node');
    } finally {
      runners.rulesLibrary = saved;
    }
  });
});

describe('zaku check --input', () => {
  it('reports what the rules script returned beside the design checks, and fails on its findings', async () => {
    const root = join(await mkdtemp(join(tmpdir(), 'zaku-')), 'design');
    await mkdir(join(root, 'map'), { recursive: true });
    await writeFile(
      join(root, 'zaku.yaml'),
      'product: acme\ndesignSystem: { shadcn: { preset: x } }\nfigma: { product: P }\ntargets:\n  - { id: web-desktop, family: web, name: Desktop }\n',
    );
    const input = join(root, 'rules.json');
    await writeFile(
      input,
      JSON.stringify({
        checked: 3,
        total: 2,
        counts: { binding: 2 },
        findings: [{ check: 'binding', field: 'fill', nodeId: '1:1', message: 'Card: fill is a raw value' }],
        cut: true,
      }),
    );
    const io = captureIo(root);
    expect(await main(['check', '--root', root, '--input', input], io)).toBe(1);
    expect(io.lines.join('\n')).toContain('Card: fill is a raw value');
    expect(io.lines).toContain('1 more binding finding the reply left out; fix these and run the script again');
  });
});
