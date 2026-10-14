# Visual Direction and Transport-Free Skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a screen is drawn from the product's own design system on either transport: the library zaku.yaml names, the code's tokens built into a library that may live in the product file, or a visual direction chosen for a product with no brand.

**Architecture:** four code changes and five skill changes. The rule checks a zaku-mcp run gets on every write are bundled into one Plugin API script (`zaku rules script`) that a Figma MCP run passes to `use_figma`; `zaku check --input` reads what it returned. `zaku library script --local` also exports the file's own components, so `zaku library save` reads a library that lives in the product file and was never published. A new skill, `choosing-a-visual-direction`, turns the profile, primary-source research and a cited data set into DTCG tokens the code and the library take.

**Tech Stack:** TypeScript, Vitest, esbuild via nx, commander (CLI), zod, Figma Plugin API, Figma REST, Claude Code skills tested with `claude -p`.

**Spec:** `docs/specs/2026-10-14-visual-direction-design.md`

## Global Constraints

- ASCII only in every authored file; scan each touched path with `perl -ne 'print "$ARGV:$.: $_" if /[^\x00-\x7F]/; close ARGV if eof' <files>` before each commit. A currency symbol or a script in quoted copy data is content and stays.
- Open the gundam skill for each file before writing it (`writing-a-component` does not apply; `writing-comments`, `naming-a-declaration`, `choosing-what-to-test`, `writing-unit-tests`, `writing-plain-ascii`, `adopting-a-library` do).
- The rules script "fits `use_figma`'s 50,000-character code limit and its reply fits the 20 KB a reply is cut at, or it is split by page." (spec decision 4)
- "A product never gets screens drawn from defaults it did not choose: a shadcn app still on its neutral defaults is a product with no brand." (spec decision 1)
- "The rule that no Figma file is created to fill a gap stays." (spec decision 2)
- Every text and UI colour pair of a direction is checked against WCAG 2.2: 4.5:1 for text, 3:1 for UI parts (spec decision 3.4).
- A data set row is "a candidate, never a reason" and carries its source (spec decision 3.3).
- `use_figma` refuses `loadAllPagesAsync`, `setPluginData` and `createImageAsync` (its tool description); a script for it uses none of them and switches page with `setCurrentPageAsync` once per call.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; PR bodies end with the Claude Code attribution line the session gives (the robot emoji, then "Generated with Claude Code" linking claude.com/claude-code).
- `plugins/zaku/bin/zaku.mjs` and the new `plugins/zaku/bin/rules.js` are committed build output: rebuild them with `mise exec -- pnpm nx run-many -t plugin-bin` after any change that reaches them, or CI's `bin` job fails on `git diff --exit-code`.
- One heavy process at a time on this machine (16 GB, swap nearly full on 2026-10-14): one vitest file, one nx target, one `claude -p` run.

## Review Focus

1. A page of 4,000 findings (the 2026-10-14 travel run): the rules script must still answer under 20 KB, with the total and the count per check, so the agent knows the size of the problem. Task 2 pins it.
2. A `zaku.yaml` that names no copy section, or one with ja/ko/zh locales, run through the script: the script must use the copy section it was printed with, not English. Task 3 pins it.
3. `figma.library` equal to `figma.product` (the library in the product file): config validation must accept it, and `zaku outline` and `zaku check` must not treat the library's pages as screens. Task 4 pins the config; Task 6's skill text says where the library pages sit.
4. A product file that holds components but is not published: `zaku library save` must read them, not write an empty library.json silently. Task 4 pins it.
5. A run that cannot ask anyone (`claude -p`, "do not ask me questions"): the direction skill must still produce screens, taking its recommended direction and marking it proposed. Task 10's GREEN criteria pin it.

---

### Task 1: Take zod out of the rules chain

`snapshot-rules.ts` imports `DEFAULT_COPY` from `lib/schema/zaku-config.ts`, which pulls zod (453 KB of a 472 KB bundle measured on 2026-10-14). Without it the chain is about 30 KB minified.

**Files:**

- Create: `packages/zaku/src/lib/domain/copy-defaults.ts`
- Modify: `packages/zaku/src/lib/schema/zaku-config.ts:173` (DEFAULT_COPY moves out; the schema imports it)
- Modify: `packages/zaku/src/lib/domain/snapshot-rules.ts:2`
- Test: covered by Task 2's size test; no test of its own (a constant moved between modules is the second reason in `choosing-what-to-test`: only an edit to the declaration could turn it red).

**Interfaces:**

- Produces: `DEFAULT_COPY: { locales: string[]; currencies: string[] }` exported from `lib/domain/copy-defaults.ts`; `zaku-config.ts` keeps exporting `DEFAULT_COPY` (re-export) so no other import changes.

- [ ] **Step 1: Move the constant**

`packages/zaku/src/lib/domain/copy-defaults.ts`:

```ts
/**
 * What copy is held to when zaku.yaml has no copy section. It sits outside the schema so the rules
 * script, which runs inside Figma, carries no validation library.
 */
export const DEFAULT_COPY: { locales: string[]; currencies: string[] } = { locales: ['en'], currencies: [] };
```

In `zaku-config.ts` replace line 173 with:

```ts
export { DEFAULT_COPY } from '../domain/copy-defaults.js';
import { DEFAULT_COPY } from '../domain/copy-defaults.js';
```

(the import goes at the top with the others; the re-export stays where the constant was). In `snapshot-rules.ts` line 2:

```ts
import type { CopyConfig } from '../schema/zaku-config.js';
import { DEFAULT_COPY } from './copy-defaults.js';
```

- [ ] **Step 2: Typecheck and run the rules specs**

Run: `mise exec -- pnpm nx run @zeroxsolutions/zaku:typecheck && cd packages/zaku && mise exec -- pnpm exec vitest run src/lib/domain/snapshot-rules.spec.ts src/lib/schema/zaku-config.spec.ts`
Expected: typecheck succeeds; both spec files pass.

- [ ] **Step 3: Commit**

```bash
git add packages/zaku/src/lib/domain/copy-defaults.ts packages/zaku/src/lib/schema/zaku-config.ts packages/zaku/src/lib/domain/snapshot-rules.ts
git commit -m "refactor(zaku): keep the copy default outside the schema

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The rules script, built for use_figma

**Files:**

- Create: `apps/zaku-figma-plugin/src/rules-script.ts`
- Create: `apps/zaku-figma-plugin/src/rules-script.spec.ts`
- Modify: `apps/zaku-figma-plugin/package.json` (nx target `build-rules-script`)
- Modify: `apps/zaku-figma-plugin/src/main.ts:62-75` (`scopeNodes` moves into `rules-script.ts` and is imported back, so the panel and the script read one scope)

**Interfaces:**

- Consumes: `snapshotNode(node, created, mixed, cache)` from `src/sandbox/snapshot.ts`; `snapshotFindings(nodes, copy)` from `packages/zaku/src/lib/domain/snapshot-rules.ts` (imported by relative path, as the probe did, since `@zeroxsolutions/zaku` exports no domain subpath).
- Produces: `zakuRules(figma, options: RulesOptions): Promise<RulesResult>` on the IIFE global `zakuRulesLib`; built file `apps/zaku-figma-plugin/dist-rules/rules.js`.

```ts
export interface RulesOptions {
  /** A page by id or name, or one node and everything inside it. */
  scope: { page: string } | { nodeId: string };
  copy: { locales: string[]; currencies: string[] };
}
export interface RulesResult {
  checked: number;
  total: number;
  /** Findings per check id, every one counted. */
  counts: Record<string, number>;
  /** The first findings, as many as fit the reply. */
  findings: Finding[];
  /** True when `findings` holds fewer than `total`. */
  cut: boolean;
}
```

- [ ] **Step 1: Write the failing spec**

`apps/zaku-figma-plugin/src/rules-script.spec.ts`:

```ts
import { zakuRules, REPLY_BYTES } from './rules-script.js';

const page = (id: string, name: string, children: unknown[]) => ({
  id,
  name,
  type: 'PAGE',
  children,
  findAll: () => children,
});
const unbound = (id: string) => ({
  id,
  name: `Card ${id}`,
  type: 'FRAME',
  parent: { id: '0:1', type: 'PAGE', name: 'Screens' },
  fills: [{ type: 'SOLID', visible: true, opacity: 1, boundVariables: {} }],
  strokes: [],
});

function fakeFigma(pages: ReturnType<typeof page>[]) {
  let current = pages[0];
  return {
    mixed: Symbol('mixed'),
    root: { children: pages },
    get currentPage() {
      return current;
    },
    setCurrentPageAsync: async (next: typeof current) => {
      current = next;
    },
    getNodeByIdAsync: async (id: string) =>
      pages.flatMap((p) => p.children as { id: string }[]).find((n) => n.id === id) ?? null,
  };
}

describe('zakuRules', () => {
  it('checks the page it is named, by name or id, under the copy it is given', async () => {
    const figma = fakeFigma([page('0:1', 'Cover', []), page('0:2', 'Screens', [unbound('1:1')])]);
    const copy = { locales: ['en'], currencies: [] };
    expect(await zakuRules(figma, { scope: { page: 'Screens' }, copy })).toMatchObject({
      checked: 1,
      total: 1,
      counts: { binding: 1 },
      findings: [{ check: 'binding', nodeId: '1:1' }],
      cut: false,
    });
    expect((await zakuRules(figma, { scope: { page: '0:2' }, copy })).checked).toBe(1);
  });

  it('answers a page of thousands of findings in a reply use_figma returns whole, with every one counted', async () => {
    const many = Array.from({ length: 4000 }, (_, i) => unbound(`1:${i}`));
    const figma = fakeFigma([page('0:1', 'Screens', many)]);
    const result = await zakuRules(figma, { scope: { page: 'Screens' }, copy: { locales: ['en'], currencies: [] } });
    expect(result.total).toBe(4000);
    expect(result.counts['binding']).toBe(4000);
    expect(result.cut).toBe(true);
    expect(new TextEncoder().encode(JSON.stringify(result)).length).toBeLessThanOrEqual(REPLY_BYTES);
  });

  it('refuses a page it cannot find, naming the pages there are', async () => {
    const figma = fakeFigma([page('0:1', 'Cover', [])]);
    await expect(
      zakuRules(figma, { scope: { page: 'Nope' }, copy: { locales: ['en'], currencies: [] } }),
    ).rejects.toThrow('no page Nope; the pages are Cover');
  });
});
```

Check `Finding`'s node field name in `packages/zaku/src/lib/domain/findings.ts` before running; if it is not `nodeId`, use its name in the first case and in Step 3.

- [ ] **Step 2: Run it to see it fail**

Run: `cd apps/zaku-figma-plugin && mise exec -- pnpm exec vitest run src/rules-script.spec.ts`
Expected: FAIL, cannot resolve `./rules-script.js`.

- [ ] **Step 3: Write the script entry**

`apps/zaku-figma-plugin/src/rules-script.ts`:

```ts
import type { Finding } from '../../../packages/zaku/src/lib/domain/findings.js';
import { snapshotFindings } from '../../../packages/zaku/src/lib/domain/snapshot-rules.js';
import { snapshotNode, type AncestryCache } from './sandbox/snapshot.js';

/** use_figma cuts a reply at 20 KB; the result keeps a margin under it for the envelope the tool adds. */
export const REPLY_BYTES = 18_000;

export interface RulesOptions {
  /** A page by id or name, or one node and everything inside it. */
  scope: { page: string } | { nodeId: string };
  copy: { locales: string[]; currencies: string[] };
}

export interface RulesResult {
  checked: number;
  total: number;
  /** Findings per check id, every one counted. */
  counts: Record<string, number>;
  /** The first findings, as many as fit the reply. */
  findings: Finding[];
  /** True when `findings` holds fewer than `total`. */
  cut: boolean;
}

// The Plugin API global, which use_figma and the plugin sandbox each hand in.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- a structural Plugin API reference
type Figma = any;

/** The nodes a check reads: one node and everything inside it, or one page. */
export async function scopeNodes(figma: Figma, scope: RulesOptions['scope'] | { page: true }): Promise<SceneNode[]> {
  if ('nodeId' in scope) {
    const node = await figma.getNodeByIdAsync(scope.nodeId);
    if (!node || node.type === 'PAGE' || node.type === 'DOCUMENT') return [];
    return 'findAll' in node ? [node, ...node.findAll()] : [node];
  }
  if (scope.page !== true) {
    const page = figma.root.children.find(
      (p: { id: string; name: string }) => p.id === scope.page || p.name === scope.page,
    );
    if (!page)
      throw new Error(
        `no page ${scope.page}; the pages are ${figma.root.children.map((p: { name: string }) => p.name).join(', ')}`,
      );
    if (page !== figma.currentPage) await figma.setCurrentPageAsync(page);
  }
  return figma.currentPage.findAll();
}

/** Runs zaku's rules over the scope inside Figma, and answers what fits a use_figma reply. */
export async function zakuRules(figma: Figma, options: RulesOptions): Promise<RulesResult> {
  const nodes = await scopeNodes(figma, options.scope);
  const cache: AncestryCache = new Map();
  const snapshot = await Promise.all(nodes.map((node) => snapshotNode(node, false, figma.mixed, cache)));
  const all = snapshotFindings(snapshot, options.copy);
  const counts: Record<string, number> = {};
  for (const finding of all) counts[finding.check] = (counts[finding.check] ?? 0) + 1;
  const result: RulesResult = { checked: snapshot.length, total: all.length, counts, findings: [], cut: false };
  const size = (): number => new TextEncoder().encode(JSON.stringify(result)).length;
  for (const finding of all) {
    result.findings.push(finding);
    if (size() > REPLY_BYTES) {
      result.findings.pop();
      result.cut = true;
      break;
    }
  }
  return result;
}
```

In `src/main.ts`, delete the local `scopeNodes` (lines 62-75) and import it: `import { scopeNodes } from './rules-script.js';`, calling `scopeNodes(figma, message.scope)`. Keep the panel's `{ all: true }` branch in `main.ts` (it calls `figma.loadAllPagesAsync()`, which the panel may and use_figma may not): wrap it there, `'all' in scope ? (await figma.loadAllPagesAsync(), figma.root.children.flatMap((page) => page.findAll())) : await scopeNodes(figma, scope)`.

The size loop is quadratic in the findings kept; it stops at about 100 findings of 180 bytes, so it runs at most a few hundred stringify calls. If Step 4's 4,000 case runs past 2 s, keep a running byte count instead of re-stringifying.

- [ ] **Step 4: Run it to see it pass**

Run: `cd apps/zaku-figma-plugin && mise exec -- pnpm exec vitest run src/rules-script.spec.ts src/sandbox`
Expected: PASS, all three new cases and the sandbox specs.

- [ ] **Step 5: Add the build target and measure it**

In `apps/zaku-figma-plugin/package.json`, beside `build-sandbox`, add:

```json
"build-rules-script": {
  "executor": "@nx/esbuild:esbuild",
  "outputs": ["{options.outputPath}"],
  "options": {
    "platform": "browser",
    "target": "es2020",
    "format": ["iife"],
    "bundle": true,
    "thirdParty": true,
    "main": "apps/zaku-figma-plugin/src/rules-script.ts",
    "outputPath": "apps/zaku-figma-plugin/dist-rules",
    "outputFileName": "rules.js",
    "tsConfig": "apps/zaku-figma-plugin/tsconfig.sandbox.json",
    "deleteOutputPath": true,
    "skipTypeCheck": true,
    "declaration": false,
    "minify": true,
    "esbuildOptions": { "globalName": "zakuRulesLib" }
  }
}
```

and add `"build-rules-script"` to `build.dependsOn`. Read `@nx/esbuild`'s schema (`node_modules/@nx/esbuild/src/executors/esbuild/schema.json`) to confirm `format` accepts `iife` and `esbuildOptions.globalName` passes through; if `format` refuses `iife`, use `esbuildOptions: { format: 'iife', globalName: 'zakuRulesLib' }` and say so in the commit body.

Run: `mise exec -- pnpm nx run zaku-figma-plugin:build-rules-script --skip-nx-cache && wc -c apps/zaku-figma-plugin/dist-rules/rules.js && grep -c "zakuRulesLib" apps/zaku-figma-plugin/dist-rules/rules.js`
Expected: under 40000 bytes (leaving room for the options and the call under 50,000); the global name found at least once. If it is over 40000, list the inputs with `--metafile` as on 2026-10-14 and remove the next value import that pulls a library before going on.

- [ ] **Step 6: Commit**

```bash
git add apps/zaku-figma-plugin
git commit -m "feat(zaku-figma-plugin): build the rules as a script use_figma runs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `zaku rules script` and `zaku check --input`

**Files:**

- Modify: `packages/zaku/src/entrypoints/cli/main.ts` (a `rulesCommand`, a `--input` option on `checkCommand`, `runners.rulesLibrary`)
- Create: `packages/zaku/src/lib/domain/rules-result.ts` (the zod schema of what the script returns, for `--input`)
- Modify: `packages/zaku/src/entrypoints/cli/main.spec.ts`
- Modify: `apps/zaku-cli/package.json` (`plugin-bin` copies `rules.js`; depends on `zaku-figma-plugin:build-rules-script`)
- Modify: `apps/zaku-cli-e2e/src/` (the e2e test file that runs the bundled CLI; read its name with `ls apps/zaku-cli-e2e/src`)

**Interfaces:**

- Consumes: `RulesResult` shape from Task 2; `rules.js` beside `zaku.mjs` in `plugins/zaku/bin/`.
- Produces: CLI `zaku rules script --root <dir> (--page <id|name> | --node <id>)` printing one script; `zaku check --input <file>` adding the result's findings to the report. `runners.rulesLibrary: () => Promise<string>` (a seam a spec replaces).

- [ ] **Step 1: Write the failing specs**

Append to `main.spec.ts`:

```ts
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
    runners.rulesLibrary = async () => 'var zakuRulesLib=(()=>({zakuRules:async()=>({})}))();';
    try {
      const io = captureIo(root);
      expect(await main(['rules', 'script', '--root', root, '--page', 'Screens'], io)).toBe(0);
      const script = io.lines.join('\n');
      expect(script.startsWith('var zakuRulesLib=')).toBe(true);
      expect(script).toContain(
        'return await zakuRulesLib.zakuRules(figma, {"scope":{"page":"Screens"},"copy":{"locales":["en","vi","ja"],"currencies":["VND"]}});',
      );
    } finally {
      runners.rulesLibrary = saved;
    }
  });

  it('uses English with no currency when zaku.yaml has no copy section, and needs a page or a node', async () => {
    const root = await design();
    const saved = runners.rulesLibrary;
    runners.rulesLibrary = async () => '';
    try {
      const io = captureIo(root);
      expect(await main(['rules', 'script', '--root', root, '--node', '1:2'], io)).toBe(0);
      expect(io.lines.join('\n')).toContain('{"scope":{"nodeId":"1:2"},"copy":{"locales":["en"],"currencies":[]}}');
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
    expect(io.lines.join('\n')).toContain(
      '1 more binding finding the reply left out; fix these and run the script again',
    );
  });
});
```

Before running, read one real `Finding` from `findings.ts` and make the fixture's fields match it exactly (the `--input` schema is strict).

- [ ] **Step 2: Run them to see them fail**

Run: `cd packages/zaku && mise exec -- pnpm exec vitest run src/entrypoints/cli/main.spec.ts -t "rules script|check --input"`
Expected: FAIL; `runners.rulesLibrary` is undefined and `rules` is an unknown command (exit 3).

- [ ] **Step 3: Implement**

`packages/zaku/src/lib/domain/rules-result.ts`:

```ts
import { z } from 'zod';
import { findingSchema } from './findings.js';

/** What `zaku rules script` answers through use_figma, as `zaku check --input` reads it back. */
export const rulesResultSchema = z
  .object({
    checked: z.number().int(),
    total: z.number().int(),
    counts: z.record(z.string(), z.number().int()),
    findings: z.array(findingSchema),
    cut: z.boolean(),
  })
  .strict();

export type RulesResult = z.output<typeof rulesResultSchema>;
```

If `findings.ts` has no `findingSchema`, take the zod schema the MCP tool output uses for findings (`entrypoints/mcp/tools.ts`, the `findings` const) and move it into `findings.ts` so both read one schema.

In `main.ts`:

```ts
const rulesCommand: CommandSpec = (program, io, finish) => {
  const rules = program
    .command('rules')
    .description("zaku's rule checks, for a run that reaches Figma through use_figma");
  rules
    .command('script')
    .description('print the Plugin API code that runs the rules over a page or a node, for use_figma')
    .option('--root <dir>', 'the design directory', 'docs/design')
    .option('--page <page>', 'the page to check, by id or name')
    .option('--node <id>', 'the node to check, with everything inside it')
    .action(async (options: { root: string; page?: string; node?: string }) => {
      if (!options.page === !options.node) {
        io.err('zaku rules script needs --page or --node, one of them');
        finish(3);
        return;
      }
      const config = await readDesignFile(designPaths(resolve(io.cwd, options.root)).config, zakuConfigSchema);
      const scope = options.node ? { nodeId: options.node } : { page: options.page as string };
      io.out(
        `${await runners.rulesLibrary()}\nreturn await zakuRulesLib.zakuRules(figma, ${JSON.stringify({ scope, copy: config.copy })});`,
      );
      finish(0);
    });
};
```

Add `rulesCommand` to `COMMANDS`, add `rules` to the usage line the first `main` spec asserts (update that expectation to `usage: zaku <check|outline|tokens|recipe|library|rules|budget|schema>` and find where the usage text is built with `grep -n "usage: zaku" packages/zaku/src`), and add the seam to `runners`:

```ts
  /** The bundled rules script, shipped beside the CLI as rules.js. */
  rulesLibrary: () => readFile(fileURLToPath(new URL('./rules.js', import.meta.url)), 'utf8'),
```

(`fileURLToPath` from `node:url`; `readFile` is already imported.) On `checkCommand`, add `.option('--input <rules.json>', 'what use_figma returned for zaku rules script')`, and after `report` is built:

```ts
if (options.input) {
  const ran = parseDesignFile(options.input, await readFile(resolve(io.cwd, options.input), 'utf8'), rulesResultSchema);
  report.findings.push(...ran.findings);
  if (ran.cut)
    for (const [check, count] of Object.entries(ran.counts)) {
      const shown = ran.findings.filter((finding) => finding.check === check).length;
      if (count > shown)
        io.err(
          `${count - shown} more ${check} finding${count - shown === 1 ? '' : 's'} the reply left out; fix these and run the script again`,
        );
    }
}
```

If the spec reads the "more" line from `io.lines` rather than `io.errors`, print it with `io.out` instead: the line is part of the report. Pick one, and make the spec and the code agree.

In `apps/zaku-cli/package.json` `plugin-bin`: `dependsOn: ["build", "zaku-figma-plugin:build-rules-script"]`, outputs add `{workspaceRoot}/plugins/zaku/bin/rules.js`, and the command becomes:

```
cp apps/zaku-cli/dist/zaku.mjs plugins/zaku/bin/zaku.mjs && cp apps/zaku-figma-plugin/dist-rules/rules.js plugins/zaku/bin/rules.js && pnpm exec oxfmt --write plugins/zaku/bin/zaku.mjs && chmod +x plugins/zaku/bin/zaku.mjs
```

(rules.js is not formatted: formatting would grow it toward the limit.)

- [ ] **Step 4: Run them to see them pass**

Run: `cd packages/zaku && mise exec -- pnpm exec vitest run src/entrypoints/cli/main.spec.ts`
Expected: PASS, the whole file.

- [ ] **Step 5: Write the e2e case over the bundle**

In the zaku-cli-e2e test file, add a case that runs `plugins/zaku/bin/zaku.mjs rules script --root <fixture> --page Screens` the way its neighbours run the CLI, and asserts exit 0, `stdout.length < 50_000`, and that stdout contains `zakuRulesLib.zakuRules(figma,`. Run: `mise exec -- pnpm nx run-many -t plugin-bin && mise exec -- pnpm nx run zaku-cli-e2e:e2e --skip-nx-cache`
Expected: PASS. Then `git status --short plugins/zaku/bin` lists `zaku.mjs` and `rules.js`.

- [ ] **Step 6: Commit**

```bash
git add packages/zaku apps/zaku-cli apps/zaku-cli-e2e plugins/zaku/bin/zaku.mjs plugins/zaku/bin/rules.js
git commit -m "feat(zaku): zaku rules script for use_figma, and check --input to read it

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: A library that lives in the product file

**Files:**

- Modify: `packages/zaku/src/lib/domain/library.ts:89-103` (`variablePartSchema` takes optional `components`)
- Modify: `packages/zaku/src/lib/adapters/figma-variables-script.ts` (`ExportOptions.local`; the export lists local components when set)
- Modify: `packages/zaku/src/lib/adapters/figma-rest-library.ts:182-200` (`readLibrary` reads `part.components` when present)
- Modify: `packages/zaku/src/entrypoints/cli/main.ts` (`zaku library script --local`; `library save` refuses an empty result)
- Test: `packages/zaku/src/lib/adapters/figma-rest-library.spec.ts`, `packages/zaku/src/lib/adapters/figma-variables-script.spec.ts`, `packages/zaku/src/lib/schema/zaku-config.spec.ts`

**Interfaces:**

- Produces: `VariablePart.components?: { id: string; key: string; name: string; page: string; description: string; set: boolean }[]`; `ExportOptions.local?: boolean`.

- [ ] **Step 1: Write the failing specs**

In `figma-rest-library.spec.ts`, a case beside the first one, using that file's `fakeFetch()` (it answers `/nodes` for the Badge set) with the published lists empty:

```ts
it('reads the components the file holds when the variables export lists them, published or not', async () => {
  const local: VariablePart = {
    ...part,
    components: [
      {
        id: '<the Badge set node id fakeFetch answers>',
        key: 'k-set',
        name: 'Badge',
        page: 'Badge',
        description: '',
        set: true,
      },
    ],
  };
  const snapshot = await readLibrary({
    rest: createFigmaRest({ token: 't', fetch: fakeFetch({ published: false }) }),
    fileKey: 'PROD',
    part: local,
  });
  expect(snapshot.components.map((component) => [component.name, component.page])).toEqual([['Badge', 'Badge']]);
});
```

Read `fakeFetch` first: give it an option that answers the `component_sets` and `components` endpoints with empty lists, and use the set's real node id there.

In `zaku-config.spec.ts`:

```ts
it('takes a library that lives in the product file', () => {
  expect(() => zakuConfigSchema.parse({ ...minimal, figma: { library: 'PROD', product: 'PROD' } })).not.toThrow();
});
```

(`minimal` is whatever valid config the spec already builds; read the file and use its helper.)

In `figma-variables-script.spec.ts`, a case that runs `exportVariables` against that spec's fake Plugin API with `{ combos: [{}], local: true }` and a page holding one `COMPONENT_SET` (id `9:1`, key `k-set`, name `Badge`, description `''`), and expects `components: [{ id: '9:1', key: 'k-set', name: 'Badge', page: '<page name>', description: '', set: true }]`; and with `local` unset, no `components` key.

- [ ] **Step 2: Run them to see them fail**

Run: `cd packages/zaku && mise exec -- pnpm exec vitest run src/lib/adapters/figma-rest-library.spec.ts src/lib/adapters/figma-variables-script.spec.ts src/lib/schema/zaku-config.spec.ts`
Expected: the library and export cases FAIL (no components read; no `components` key). If the config case passes already, it is not a regression to write: delete it (the schema at `zaku-config.ts:82` already allows any two keys) and say so in the commit body.

- [ ] **Step 3: Implement**

`library.ts`, in `variablePartSchema`:

```ts
    /** The components the file itself holds, for a library that lives in the product file and is not published. */
    components: z
      .array(
        z
          .object({ id: z.string(), key: z.string(), name: z.string(), page: z.string(), description: z.string(), set: z.boolean() })
          .strict(),
      )
      .optional(),
```

`figma-variables-script.ts`: `ExportOptions` gains `/** List the file's own components too, for a library in the product file. */ local?: boolean;`. Inside `exportVariables`, before `return`:

```ts
const components: NonNullable<VariablePart['components']> = [];
if (options.local) {
  for (const page of figma.root.children) {
    // use_figma refuses loadAllPagesAsync; a page loads on its own.
    await page.loadAsync();
    for (const node of page.findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] })) {
      if (node.type === 'COMPONENT' && node.parent?.type === 'COMPONENT_SET') continue;
      components.push({
        id: node.id,
        key: node.key,
        name: node.name,
        page: page.name,
        description: node.description ?? '',
        set: node.type === 'COMPONENT_SET',
      });
    }
  }
}
return {
  exportedAt: new Date().toISOString(),
  variables,
  textStyles,
  tokens,
  ...(options.local ? { components } : {}),
};
```

(the function is serialized with `toString`, so this stays inside its body.) `figma-rest-library.ts`, replacing the `listed`/`published` lines:

```ts
const listed = part.components
  ? {
      sets: part.components.filter((c) => c.set).map(asPublished),
      components: part.components.filter((c) => !c.set).map(asPublished),
    }
  : await rest.published(fileKey);
```

with, at module level:

```ts
/** A component the variables export listed, in the shape the published lists answer. */
function asPublished(component: NonNullable<VariablePart['components']>[number]): RestPublished {
  return {
    node_id: component.id,
    key: component.key,
    name: component.name,
    description: component.description,
    containing_frame: { pageName: component.page },
  };
}
```

In `main.ts`, `library script` gains `.option('--local', "also list the file's own components, for a library in the product file")` and passes `local: options.local === true`. In `library save`, after the snapshot, refuse a library that read nothing: `if (snapshot.components.length === 0) { io.err('library.json holds no components: the file publishes none and the export listed none; run zaku library script --local'); finish(1); return; }` - and a spec case for it beside `counts the REST calls library save made` (read that case for its fakes).

- [ ] **Step 4: Run them to see them pass**

Run: `cd packages/zaku && mise exec -- pnpm exec vitest run src/lib/adapters src/lib/schema/zaku-config.spec.ts src/entrypoints/cli/main.spec.ts`
Expected: PASS.

- [ ] **Step 5: Rebuild the bundle and commit**

```bash
mise exec -- pnpm nx run-many -t plugin-bin
git add packages/zaku plugins/zaku/bin/zaku.mjs
git commit -m "feat(zaku): read a library that lives in the product file

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: drawing-a-screen draws from the product's design system, on either transport

RED is on record: the 2026-10-14 runs (`travel-zaku`, `fintech-zaku`: wireframes and a diagram for want of a library; `travel-figma2`: Simple Design System instead of the app's tokens; `fintech-figma2`: Nova defaults). Quote them in the CREATION-LOG entry; do not rerun them.

**Files:**

- Modify: `plugins/zaku/skills/drawing-a-screen/SKILL.md` (`## Before the first node`, `## Done means the outline passes`, the rationalizations and checklist)
- Modify: `plugins/zaku/skills/drawing-a-screen/references/figma.md` (a section per transport)
- Modify: `plugins/zaku/skills/drawing-a-screen/CREATION-LOG.md`

- [ ] **Step 1: Replace item 2 of `## Before the first node`** with:

```md
2. The design system the screen is drawn from is the first of these that exists, and the reply names
   which:
   1. the library `zaku.yaml`'s `figma.library` names;
   2. the design system the product's code already has, once its token source holds values of the
      product's own and not only its UI kit's defaults: the library is built from it first
      (`building-the-library`), in the product file when no library file exists;
   3. a visual direction chosen for the product (`choosing-a-visual-direction`), which becomes the
      code's tokens and then the library, as in 2.

   A library the team happens to have enabled is none of these unless `zaku.yaml` names it: a sample
   kit or another product's library draws a product that does not exist. A shadcn app still on its
   neutral defaults has no brand yet, and goes to 3.

3. Every block the screen holds is a component of that design system, or of the product file's
   component pages (`writing-a-design-component`). A block that is not yet one is made one first,
   because every state and every target repeats it.
```

and renumber the budget item to 4.

- [ ] **Step 2: Replace `## Done means the outline passes`** with:

```md
## Done means the checks pass

The rules a write is held to run after every write, whichever way the run reaches the file; the
reference spells each transport. Over zaku-mcp, `run_script` checks what it touched and `check_rules`
checks a page. Over the Figma MCP server, `zaku rules script --page <page>` prints a script, the
run passes it to `use_figma` once per page it drew, saves what it returned, and
`zaku check --input <that file>` reports it with the design checks. A reply that says more findings
were left out is fixed and run again, not reported.

After the last write, run `zaku outline --frames <the ids written>` and `zaku check`. The reply lists
every frame drawn by name, and claims nothing the checks contradict. A check that cannot run (no
`FIGMA_TOKEN`, no library snapshot) is named in the reply with what it needs; it is never reported as
passed, and the screen is not reported done.
```

- [ ] **Step 3: Add rows** to `## Common Rationalizations`:

```md
| "A library is enabled in the file, so I draw with it" | Only the library `zaku.yaml` names, the code's own tokens, or a chosen direction is the product's design system |
| "There is no library, so I draw wireframes" | Build the library from the code into the product file, or choose a direction; then draw the screens |
| "zaku check is not installed here" | It ships in the plugin's `bin/`; over the Figma MCP server the rules run as `zaku rules script` |
```

and to the checklist: `- [ ] The reply names which design system source the screen was drawn from` and `- [ ] The rules ran on every page drawn, over the transport the run used, and none was left out`.

- [ ] **Step 4: Write the transport section of `references/figma.md`**

Add a section `## Reaching the file` with a table, one row per step, a column per transport:

```md
| Step              | zaku-mcp                         | Figma MCP server                                                                 |
| ----------------- | -------------------------------- | -------------------------------------------------------------------------------- |
| Write a state     | `run_script`, strict mode        | `use_figma`; then the rules script for the page                                  |
| Check a page      | `check_rules` with `scope: page` | `zaku rules script --page <page>` through `use_figma`, then `zaku check --input` |
| Read nodes        | `read_nodes`                     | `use_figma` returning what it read                                               |
| Render            | `get_screenshot`                 | `get_screenshot`                                                                 |
| Bring an image in | the reference's image steps      | `upload_assets`, then reuse its hash in `use_figma`                              |
```

Before writing the Figma MCP column, read the installed figma plugin's `use_figma` and `upload_assets` descriptions (`ToolSearch select:mcp__plugin_figma_figma__use_figma,mcp__plugin_figma_figma__upload_assets`) and correct any cell they contradict. Add one line: "A `use_figma` script switches page with `setCurrentPageAsync` once per call; the rules script does it for the page it is given."

- [ ] **Step 5: Log, scan and commit**

Append an entry to `CREATION-LOG.md` dated 2026-10-14: what failed (the four runs, quoted from their replies), what changed, and that GREEN is Task 10. Scan with the perl line from Global Constraints. Commit:

```bash
git add plugins/zaku/skills/drawing-a-screen
git commit -m "feat(zaku): draw a screen from the product's design system on either transport

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: building-the-library builds into the product file when there is no library file

**Files:**

- Modify: `plugins/zaku/skills/building-the-library/SKILL.md` (`## Before the first drawing`, the rationalization about the key, red flags)
- Modify: `plugins/zaku/skills/building-the-library/references/figma.md` (`zaku library script --local`; the transport table)
- Modify: `plugins/zaku/skills/building-the-library/CREATION-LOG.md`

- [ ] **Step 1: Rewrite `## Before the first drawing`'s first paragraph** to:

```md
The library lives in a file `zaku.yaml` names by its key (`figma.library`), so `zaku library save` can
read it back against the code. That file is the library's own, saved in the team, when one exists;
when the product has no library file, the library is built into the product file, on the same pages
and with the same documentation, and `figma.library` holds the product file's key. It moves to a file
of its own when a second product file needs it, and the reply says so when a second file appears.
`zaku library script --local` exports the file's own components with its variables, because a library
in the product file is not published. When `zaku.yaml` holds anything that is not a file's key (a
placeholder, a note to replace it later), draw nothing and ask for the address.
```

Keep the paragraph after it ("No Figma file is created to fill a gap...") unchanged.

- [ ] **Step 2: Update the rationalization row** "The library file has no key yet; I'll write a placeholder..." to keep its reality and add: "With no library file, the product file is the library's file: its key goes in `figma.library`." Add a red flag: `- Drawing a screen while the product has components in no library zaku.yaml names`.

- [ ] **Step 3: Update `references/figma.md`**: where it says `zaku library script` prints the variables export, add that `--local` lists the file's own components too, and that it runs through `use_figma` or a zaku-mcp `run_script` alike. Add the same `## Reaching the file` table as Task 5 Step 4, with the library's rows (write a component, check a page, render, save the library).

- [ ] **Step 4: Log, scan and commit**

```bash
git add plugins/zaku/skills/building-the-library
git commit -m "feat(zaku): build the library into the product file when there is no library file

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: The data set the direction skill draws candidates from

**Files:**

- Create: `plugins/zaku/skills/choosing-a-visual-direction/references/directions.md`

The data set is research, so this task opens `researching-a-claim` and follows it for every row: primary sources only, each with its URL and the date read.

- [ ] **Step 1: Write the file's head and its row format**

```md
# Directions: candidates for a visual direction

Every row is a candidate, never a reason. A direction keeps a value only after holding it against the
product's profile and research, and its record says why it fits that audience. Each row names the
source it came from and the date it was read.

## Type families

| Family | Category | Scripts covered | Weights | Licence | Suits | Source, read |
| ------ | -------- | --------------- | ------- | ------- | ----- | ------------ |

## Scales

| System | Radius steps | Spacing base | Type ratio | Density | Motion | Source, read |
| ------ | ------------ | ------------ | ---------- | ------- | ------ | ------------ |

## Colour meanings by culture

| Colour | Culture or market | Meaning | Use it for | Avoid it for | Source, read |
| ------ | ----------------- | ------- | ---------- | ------------ | ------------ |

## Domain conventions

| Domain | Convention | Seen in | Status (evidence or assumption) | Source, read |
| ------ | ---------- | ------- | ------------------------------- | ------------ |
```

- [ ] **Step 2: Fill the rows, each from its primary source**

- Type families: at least 12 Google Fonts families whose page lists the `vietnamese` subset, plus Noto Sans JP, Noto Sans KR and Noto Sans SC for the CJK locales; the scripts column read from the family's Google Fonts page or its repository, not recalled.
- Scales: Material 3, Apple HIG, Fluent 2, Carbon, Atlassian, Polaris, GOV.UK Design System, Primer, and shadcn base-nova's own defaults (so the skill can say when a product is still on them); each value read from the system's published tokens or docs page.
- Colour meanings: Vietnam (red, yellow, white, green, the lotus pink), and the visitor markets travel names in its profile (Korea, Japan, China, the US, Western Europe), from anthropological, government or museum sources; a blog listicle is not a source.
- Domain conventions: payments and wallets in Vietnam (MoMo, ZaloPay, VNPay, bank apps), travel booking (Booking.com, Klook, GetYourGuide, Traveloka), each convention seen in the product's own published screens or brand page.

A row whose source cannot be read is left out, not filled from memory.

- [ ] **Step 3: Scan and commit**

```bash
git add plugins/zaku/skills/choosing-a-visual-direction/references/directions.md
git commit -m "feat(zaku): the cited data set a visual direction draws candidates from

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: The choosing-a-visual-direction skill

**Files:**

- Create: `plugins/zaku/skills/choosing-a-visual-direction/SKILL.md`
- Create: `plugins/zaku/skills/choosing-a-visual-direction/references/figma.md`
- Create: `plugins/zaku/skills/choosing-a-visual-direction/CREATION-LOG.md`
- Create: `plugins/zaku/skills/choosing-a-visual-direction/test-giving-a-wallet-its-look.md`
- Modify: `plugins/zaku/.claude-plugin/plugin.json` (the description names the new skill)

Open `superpowers:writing-skills` before this task and follow it. RED is the 2026-10-14 `fintech-figma2` run (Nova defaults, indigo primary, no direction recorded); the test file records it.

- [ ] **Step 1: Write the test file first**

`test-giving-a-wallet-its-look.md`, in the format of `drawing-a-screen/test-drafting-a-flows-copy.md`: the prompt is the core RED fintech prompt with a new file's URL; the inputs are `fintech-src` (Sen Wallet README and the skeleton apps, shadcn on neutral defaults); the run uses the plugin with zaku's MCP tools refused. Pass criteria, all observable in the reply, the repo and the file:

1. `docs/design/decisions/` holds a visual-direction record with two or three directions, each with its tokens, its voice, the data set rows it took (by table and row) and why each fits the profile.
2. Every text and UI colour pair of the chosen direction is listed with its contrast ratio, each at least 4.5:1 for text and 3:1 for UI parts.
3. The research cites at least one primary source per claim about the audience's colour meanings and the market's conventions.
4. The chosen direction is in the code's token source and `zaku.yaml` names it (`designSystem.dtcg`).
5. The product file has a board per direction; the screens use the chosen one's variables, not Nova's defaults.
6. The reply says the direction was proposed, because nobody could be asked.

- [ ] **Step 2: Write `SKILL.md`**

Frontmatter: `name: choosing-a-visual-direction`, `description: Use when a product has no brand of its own and a screen, a library or a style is about to be drawn, before any colour, type or radius is picked`. Sections, in the order the plugin's other skills use (`## Overview`, `## When to Use`, the procedure, `## Common Rationalizations`, `## Red Flags - STOP`, `## Verification Checklist`):

- **Core principle:** a product's look is chosen for its audience, from research and the profile, and a value the data set offers is a candidate the audience has to confirm.
- **When it is needed**: decision 1's test, verbatim: no library `zaku.yaml` names, and a code token source that holds only its UI kit's defaults (compare with the kit's defaults row in `references/directions.md`).
- **The procedure**: decision 3's six steps, each a numbered section, with what each writes: the profile entries it read; the research through `researching-a-claim`; the candidate rows, by table and row; the two or three directions as DTCG token documents (colour roles light and dark, type scale and families, radius, spacing, density, motion) and a voice; the contrast table; the board per direction (`references/figma.md`); the pick, asked for, or taken and marked proposed when nobody can be asked; the record in `docs/design/decisions/visual-direction.md`; the tokens written to the code's token source and `zaku.yaml`'s `designSystem.dtcg` naming them; then `building-the-library`.
- **A family covers the locales**: every family a direction keeps covers every script `zaku.yaml`'s `copy.locales` is written in, read from the data set's scripts column.
- **Rationalizations**: "The data set says fintech is blue" -> the audience decides; "Nova's defaults are a direction" -> they are nobody's choice; "I was told not to ask, so I skip the direction" -> take the recommended one and mark it proposed; "Contrast looks fine" -> the ratio is computed and listed.

- [ ] **Step 3: Write `references/figma.md`**: how a direction board is drawn (a frame per direction, its palette as swatches bound to the direction's variables, its type ramp as text in its families, and one block of the feature in it), and the transport table from Task 5 for the board's writes.

- [ ] **Step 4: Name it in the plugin description**, after "who a product is for before a design decision,": "how a product with no brand gets a visual direction from research,". Scan and commit:

```bash
git add plugins/zaku/skills/choosing-a-visual-direction plugins/zaku/.claude-plugin/plugin.json
git commit -m "feat(zaku): choosing-a-visual-direction, for a product with no brand

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Every other skill's reference names both transports

**Files:**

- Modify: `plugins/zaku/skills/writing-a-design-component/references/figma.md`
- Modify: `plugins/zaku/skills/reviewing-a-design/references/figma.md`
- Modify: `plugins/zaku/skills/reading-a-design/references/figma.md`
- Modify: `plugins/zaku/skills/prototyping-a-flow/references/figma.md`
- Modify: each skill's `SKILL.md` where it names a zaku-mcp tool as the only way (find them with `grep -n "run_script\|check_rules\|read_nodes\|get_screenshot" plugins/zaku/skills/*/SKILL.md`)

- [ ] **Step 1: List every place a skill names one transport**

Run: `grep -rn "run_script\|check_rules\|read_nodes\|zaku-mcp\|use_figma" plugins/zaku/skills/*/SKILL.md plugins/zaku/skills/*/references/figma.md`
Write the list into the commit body. Every hit in a `SKILL.md` that names a tool as the only way becomes the decision in words ("the write is checked") with the tool named in the reference.

- [ ] **Step 2: Add the `## Reaching the file` table** (Task 5 Step 4's rows that skill uses) to each listed reference, and change each `SKILL.md` hit.

- [ ] **Step 3: Scan and commit**

```bash
git add plugins/zaku/skills
git commit -m "docs(zaku): every skill reference names both ways to reach the file

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: GREEN, the 2x2 again

**Files:**

- Modify: each changed skill's `CREATION-LOG.md` (the GREEN result)
- Scratch only: `$CLAUDE_JOB_DIR/tmp/core-green/` (arm directories, prompts, outputs, `criteria.md` kept out of every arm)

Needs from the person: four empty Figma files (travel and Sen Wallet, each for zaku-mcp and for the Figma MCP server), the zaku panel open and paired in the two zaku-mcp files, a `FIGMA_TOKEN` the runs read from the keychain, and SF Pro installed for the iOS kit's text. Ask for them in one message; run nothing in those files until they are given.

- [ ] **Step 1: Make the arms**

As on 2026-10-14 (`core-red/`): `git clone -q core-red/travel-src` and `core-red/fintech-src` into four arm directories; `.claude/settings.json` with gundam, superpowers, figma and zaku enabled in every arm; the prompts are the RED prompts with the new file URLs. The plugin is the main checkout's after this branch merges, rebuilt (`plugin-bin` for zaku-cli and zaku-mcp).

- [ ] **Step 2: Run them one at a time**

```bash
D=$CLAUDE_JOB_DIR/tmp/core-green
for a in travel-zaku fintech-zaku; do (cd $D/$a && FIGMA_TOKEN=$(security find-generic-password -s FIGMA_TOKEN -w) ENABLE_CLAUDEAI_MCP_SERVERS=false claude -p --model claude-opus-5-5 --output-format stream-json --verbose --dangerously-skip-permissions "$(cat $D/$a.prompt)" > $D/$a.jsonl 2> $D/$a.err; echo "$a exit $?" >> $D/done.log); done
for a in travel-figma fintech-figma; do (cd $D/$a && FIGMA_TOKEN=$(security find-generic-password -s FIGMA_TOKEN -w) ENABLE_CLAUDEAI_MCP_SERVERS=false claude -p --model claude-opus-5-5 --output-format stream-json --verbose --dangerously-skip-permissions --disallowedTools=mcp__plugin_zaku_zaku "$(cat $D/$a.prompt)" > $D/$a.jsonl 2> $D/$a.err; echo "$a exit $?" >> $D/done.log); done
```

Read each run's init line first (zaku skills listed; on the Figma arms, no `mcp__plugin_zaku_zaku__` tool).
Expected: four `exit 0` lines.

- [ ] **Step 3: Score each arm against the spec's GREEN line and Task 8's criteria**

GREEN, from the spec: "all four draw real screens of every state the map names; travel's from its `global.css`, Sen Wallet's from a direction the run chose and recorded; the records hold research with sources, the data set rows used, and the contrast pairs; no Figma file is created; the rule checks ran on both transports and the reply claims nothing they contradict." Score each line with its evidence (a file path, a node id, a quoted reply line); render the files with zaku's `get_screenshot` (panel open) for the visual read. A line that fails is a finding for the skill it belongs to; fix it in that skill and rerun only that arm.

- [ ] **Step 4: Log and commit**

Each changed skill's `CREATION-LOG.md` gets the GREEN result with its evidence. Scan and commit:

```bash
git add plugins/zaku/skills
git commit -m "docs(zaku): GREEN for the visual direction and both transports

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
