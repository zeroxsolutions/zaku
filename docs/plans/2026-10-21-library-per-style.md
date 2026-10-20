# Library per Style Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a product names several Figma libraries, each target draws from its own library and the ones that library extends, every check holds a frame to its target's libraries, and a library moved onto another style shows every reference left behind.

**Architecture:**

- `zaku.yaml` gains `figma.libraries` and `targets[].library`. One new domain module resolves a target to its chain of library names.
- Snapshots move to `design/library/<name>.json`. A product on `figma.library` keeps `design/library.json` under the name `default`.
- `CheckInput.library` becomes `libraries`, a record by name. The export and the REST reader record the keys each library item references, which is what the leftover check compares.
- Three skills change: `building-the-library`, its new procedure file, and `drawing-a-screen`. Each change is RED before its edit and GREEN after.

**Tech Stack:** TypeScript, Vitest, zod, commander (CLI), Figma Plugin API, Figma REST, Claude Code skills tested with `claude -p`.

**Spec:** `docs/specs/2026-10-21-library-per-style-design.md`

## Global Constraints

- ASCII only in every authored file. Before each commit, scan each touched path with `perl -ne 'print "$ARGV:$.: $_" if /[^\x00-\x7F]/; close ARGV if eof' <files>`.
- Before writing each file, open the gundam skill for it: `writing-comments`, `naming-a-declaration`, `choosing-what-to-test`, `writing-unit-tests`, `writing-plain-ascii`, `authoring-doctrine` for skill files. Before editing any file under `plugins/zaku/`, also open `gundam-governs-zaku-too`.
- "A product with one library writes nothing new." (spec decision 1) Every existing spec stays green with `figma.library` alone, and `design/library.json` keeps its path.
- `--library` is "required when zaku.yaml names more than one" library (spec decision 2).
- "Variable bindings on a product frame stay unchecked" (spec decision 3). No task reads them.
- `use_figma` refuses `loadAllPagesAsync`, `setPluginData` and `createImageAsync`. The export script uses none of them.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Each message is written to a file and passed with `-F`, and names its paths.
- `plugins/zaku/bin/zaku.mjs` is committed build output. After any task that reaches the CLI, rebuild it with `mise exec -- pnpm nx run-many -t plugin-bin`, or CI's `bin` job fails on `git diff --exit-code`.
- Run one heavy process at a time: one vitest file, one nx target, one `claude -p` run.
- Skill runs come from a `/tmp` scratch directory with no project memory. RED loads a `git archive origin/master` export of `plugins/zaku`, and GREEN loads the worktree's. Every arm gets the same tools.

## Review Focus

1. A travel product file whose `zaku.yaml` still says `figma.library`, and whose `docs/design/library.json` and outlines carry `libraryVersion`. `zaku check` must read both unchanged. Task 3 pins it with a legacy outline fixture.
2. A library that extends another, saved before the library it extends. The leftover check cannot know the extended keys yet, so it reports `notRun` naming the missing snapshot rather than flagging every reference as foreign. Task 6 pins it.
3. A nested instance inside a library component, such as Vega's Input OTP Slot inside a ZUI Code Input. It must not count as a reference of the ZUI item: the REST reader does not descend into instances (`figma-rest-library.ts`, `visit`), and only the outermost instance key is checked. Task 5 pins it.
4. An unpublished helper component of the library's own file, such as a `_Slot`. The leftover check must accept it as the file's own. Task 6 builds the own-keys set from the export's `components` list as well as the published ones.
5. A product file with both Nova and Vega enabled, saved as a library by mistake. The export must refuse, naming both libraries that hold a `semantic` collection, never pick one. Task 4 pins it.

---

### Task 1: Libraries in zaku.yaml

**Files:**

- Create: `packages/zaku/src/lib/domain/libraries.ts`
- Modify: `packages/zaku/src/lib/schema/zaku-config.ts:36-47` (target), `:83` (files), `:183-205` (refinements)
- Test: `packages/zaku/src/lib/schema/zaku-config.spec.ts`, `packages/zaku/src/lib/domain/libraries.spec.ts`

**Interfaces:**

- Produces:
  - In `zaku-config.ts`, `targetSchema` gains `library: id.optional()`.
  - `files` becomes `{ library?: string; libraries?: Record<string, string | { key: string; extends: string }>; product?: string }`.
  - From `domain/libraries.ts`:
    - `DEFAULT_LIBRARY = 'default'`
    - `libraryNames(config: ZakuConfig): string[]`
    - `libraryKey(config: ZakuConfig, name: string): string | undefined`
    - `libraryChain(config: ZakuConfig, name: string): string[]`, with the name first and then each library it extends.
    - `targetLibraries(config: ZakuConfig, targetId: string): string[]`, the chain of the target's library. It is `['default']` on `figma.library`, and the one library's chain when only one is listed.
  - `libraries.ts` imports only types from the schema, so the rules chain stays free of zod.

- [ ] **Step 1: Write the failing tests** in `zaku-config.spec.ts`:
  - `it('loads figma.libraries with a target naming one')`: `figma: { libraries: { nova: 'N', vega: 'V', 'zui-vega': { key: 'Z', extends: 'vega' } } }`, targets `ios-phone` with `library: 'zui-vega'` and `web-desktop` with `library: 'nova'`. Expect `success: true`.
  - `it('refuses figma.library beside figma.libraries')`: issue path `['figma']`.
  - `it('refuses a target naming no library when two are listed')`: issue path `['targets', 0, 'library']`.
  - `it('refuses a target naming an unlisted library')`: message contains `no library named`.
  - `it('refuses a library extending an unlisted one')`: path `['figma', 'libraries', 'zui', 'extends']`.
  - `it('refuses a chain that comes back to itself')`: `a` extends `b`, `b` extends `a`. Message contains `a -> b -> a`.
  - `it('still loads figma.library alone')`.

  In `libraries.spec.ts`:
  - `libraryChain(config, 'zui-vega')` equals `['zui-vega', 'vega']`.
  - `targetLibraries(config, 'web-desktop')` equals `['nova']`.
  - On a `figma.library` config, `targetLibraries(c, 'any')` equals `['default']` and `libraryKey(c, 'default')` equals the key.

- [ ] **Step 2: Run them and see them fail**
      Run: `cd packages/zaku && mise exec -- pnpm exec vitest run src/lib/schema/zaku-config.spec.ts src/lib/domain/libraries.spec.ts`
      Expected: FAIL. The strict `files` object rejects `libraries`, and `libraries.ts` is missing.

- [ ] **Step 3: Implement the schema and the module.** The refinement walks `extends` with a visited set to report the cycle text `a -> b -> a`. `libraryChain` assumes a validated config.

- [ ] **Step 4: Run them and see them pass**, plus `mise exec -- pnpm nx run @zeroxsolutions/zaku:typecheck`.

- [ ] **Step 5: Commit** `feat(zaku): name several libraries and the one each target draws from`

### Task 2: One snapshot per library, saved by name

**Files:**

- Modify: `packages/zaku/src/lib/repositories/design-paths.ts`, `packages/zaku/src/lib/handlers/save-library.ts`, `packages/zaku/src/lib/commands/save-library.ts`, `packages/zaku/src/entrypoints/cli/main.ts:288-330`, `packages/zaku/README.md:19`
- Test: `packages/zaku/src/lib/handlers/save-library.spec.ts`, `packages/zaku/src/entrypoints/cli/main.spec.ts`

**Interfaces:**

- Consumes: `libraryNames` and `libraryKey` from Task 1.
- Produces:
  - `librarySnapshotPath(paths: DesignPaths, name: string): string`, which is `paths.library` for `default` and `join(paths.root, 'library', name + '.json')` otherwise.
  - `SaveLibraryInput` gains `library?: string`.
  - `saveLibrary` creates the `library/` directory when it is missing.

- [ ] **Step 1: Write the failing tests:**
  - `save-library.spec.ts`, `it('writes library/vega.json for --library vega')`: assert the file at that path and its `source` equals `V`.
  - `it('refuses two libraries without --library, naming the flag')`: rejects with a message containing `--library` and both names.
  - `it('refuses an unknown --library')`.
  - `it('writes library.json on figma.library')`: the existing behaviour, kept.
  - `main.spec.ts`, `-t "library save"`: `zaku library save --library vega --input v.json` prints `wrote library/vega.json: N components`. Without `--library` on two libraries, it exits 3 with the message.

- [ ] **Step 2: Run them and see them fail**
      Run: `cd packages/zaku && mise exec -- pnpm exec vitest run src/lib/handlers/save-library.spec.ts`

- [ ] **Step 3: Implement.** The refusals throw a new `LibraryNameMissing(names: string[])` from `domain/errors/`, which the CLI maps to exit 3 the way it maps `FigmaFileKeyMissing`. The README row names both paths.

- [ ] **Step 4: Run both spec files** and see them pass. Then rebuild `plugin-bin`.

- [ ] **Step 5: Commit** `feat(zaku): save each library's snapshot under its name`

### Task 3: Checks read the libraries by name

**Files:**

- Modify: `packages/zaku/src/lib/domain/findings.ts:63`, `packages/zaku/src/lib/repositories/design.ts:49`, `packages/zaku/src/lib/domain/outline.ts` (`libraryVersion`), `packages/zaku/src/lib/handlers/write-outline.ts:112,137,176,194`, `packages/zaku/src/lib/domain/checks/{binding,overrides,freshness,font,library}.ts`, `packages/zaku/src/test/fixtures.fixture.ts:50`
- Test: `packages/zaku/src/lib/repositories/design.spec.ts`, `packages/zaku/src/lib/domain/checks/freshness.spec.ts`, and every existing check spec, kept green.

**Interfaces:**

- Consumes: `targetLibraries` and `libraryNames` from Task 1, `librarySnapshotPath` from Task 2.
- Produces:
  - `CheckInput.libraries: Readonly<Record<string, LibrarySnapshot>>` replaces `library`. It holds every snapshot that exists.
  - In `domain/libraries.ts`, `snapshotsFor(input: Pick<CheckInput, 'config' | 'libraries'>, targetId: string): { snapshots: LibrarySnapshot[]; missing: string[] }`.
  - The outline gets `libraryVersions: Record<string, string>`. A legacy `libraryVersion: string | null` is read as `{ default: v }` or `{}`, through `z.preprocess` on `screenOutlineSchema`.
  - This task changes no finding. `binding` and `overrides` iterate every snapshot. `freshness` compares each name the outline recorded. `font` and `library` take the union of every snapshot until Tasks 6 and 7 narrow them.
  - A check that needs a missing snapshot returns `{ notRun: 'library/<name>.json is missing' }`. For `default` it keeps the old text `library.json is missing`.

- [ ] **Step 1: Write the failing tests:**
  - `design.spec.ts`, `it('reads every library snapshot by name')`: a design root with `library/nova.json` and `library/vega.json`. Expect `input.libraries` keys `['nova', 'vega']`.
  - `it('reads a legacy outline with libraryVersion')`: an outline JSON holding `"libraryVersion": "123"` loads with `libraryVersions` equal to `{ default: '123' }`.
  - `freshness.spec.ts`, `it('reports the library whose version moved')`: outline `{ nova: '1', vega: '1' }`, snapshots nova `1` and vega `2`. One finding, whose message contains `vega`.

- [ ] **Step 2: Run them and see them fail.**

- [ ] **Step 3: Rename the field and thread it through the five checks, the loader and the outline writer.** Update the fixture to `libraries: {}`.

- [ ] **Step 4: Run every check spec, then typecheck**
      Run: `cd packages/zaku && mise exec -- pnpm exec vitest run src/lib/domain/checks src/lib/repositories/design.spec.ts src/lib/handlers/write-outline.spec.ts`
      Expected: all PASS, with no existing assertion edited beyond `library` becoming `libraries`.

- [ ] **Step 5: Commit** `refactor(zaku): read library snapshots by name in every check`

### Task 4: The export records variable keys and resolves an extending library

**Files:**

- Modify: `packages/zaku/src/lib/adapters/figma-variables-script.ts`, `packages/zaku/src/lib/domain/library.ts` (`variablePartSchema`)
- Test: `packages/zaku/src/lib/adapters/figma-variables-script.spec.ts`

**Interfaces:**

- Produces new optional fields on `variablePartSchema`, with defaults so an older `variables.json` still parses:
  - `variableKeys: Record<string, { key: string; local: boolean }>`, keyed like `variables`, with the `VariableID:` prefix dropped.
  - `effectStyles: { key: string; name: string }[]`.
- Behaviour: when the file has no local `semantic` collection, the script calls `figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync()` and keeps the libraries holding a collection named `semantic`.
  - With exactly one such library, it imports that library's variables with `importVariableByKeyAsync`. They become the `collections` that the combos and the token values resolve through, and they join `variables` and `variableKeys` with `local: false`.
  - With none, it throws `the file has no semantic collection and no enabled library has one`.
  - With two or more, it throws `several enabled libraries hold a semantic collection: <names>; enable only the one this library extends`.

- [ ] **Step 1: Write the failing tests** with the spec file's fake `figma`:
  - `it('records each local variable key')`: `variableKeys['1:2']` equals `{ key: 'k12', local: true }`.
  - `it('resolves an extending library through the one enabled semantic library')`: no local collections, and the team library lists `Shadcn UI - Vega` with `semantic`. Tokens resolve, and the imported variables are `local: false`.
  - `it('refuses when two enabled libraries hold semantic')`: the message names `Shadcn UI - Nova` and `Shadcn UI - Vega`.
  - `it('lists the effect styles')`.

- [ ] **Step 2: Run it and see it fail**
      Run: `cd packages/zaku && mise exec -- pnpm exec vitest run src/lib/adapters/figma-variables-script.spec.ts`

- [ ] **Step 3: Implement it inside `exportVariables`.** It is serialized with `toString`, so it reaches no helper outside its own body.

- [ ] **Step 4: Run it and see it pass.** Then check that `zaku library script` output is still under 50,000 characters: `node plugins/zaku/bin/zaku.mjs library script --root <fixture> | wc -c`.

- [ ] **Step 5: Commit** `feat(zaku): export variable keys and resolve a library that extends another`

### Task 5: The snapshot records what each item references

**Files:**

- Modify: `packages/zaku/src/lib/adapters/figma-rest-library.ts:120-175` (`itemsOf`), `:236-260` (snapshot), `packages/zaku/src/lib/domain/library.ts` (`libraryItemSchema`, `libraryPartSchema`), `packages/zaku/src/lib/adapters/figma-rest-types.ts` (the `boundVariables` and `styles.effect` shapes)
- Test: `packages/zaku/src/lib/adapters/figma-rest-library.spec.ts`

**Interfaces:**

- Consumes: `variableKeys` and `effectStyles` from Task 4.
- Produces:
  - `LibraryItem` gains `variableIds: string[]` and `effectStyleKey: string | null`.
    - `variableIds` holds every alias id in `node.boundVariables`: single, arrays (per-range `fontFamily` included) and nested paint bindings, deduplicated, prefix dropped.
  - The snapshot gains `variableKeys` (copied from the export) and `effectStyles`.
  - Both default to empty, so an older `library.json` still parses.

- [ ] **Step 1: Write the failing tests:**
  - `it('records every bound variable id, per-range bindings included')`: a TEXT node with `boundVariables: { fontFamily: [{ id: 'VariableID:abc/1:2' }, { id: 'VariableID:abc/1:2' }], fills: [...] }`. `variableIds` equals `['abc/1:2', <fill id>]`.
  - `it('records the effect style key')`.
  - `it('does not descend into an instance for references')`: a component holding an instance that holds a bound text. Only the instance's own ids are recorded (Review Focus 3).

- [ ] **Step 2: Run it and see it fail**
      Run: `cd packages/zaku && mise exec -- pnpm exec vitest run src/lib/adapters/figma-rest-library.spec.ts`

- [ ] **Step 3: Implement** with one helper, `aliasIds(bound: unknown): string[]`, which flattens the alias shapes REST returns.

- [ ] **Step 4: Run it and see it pass.**

- [ ] **Step 5: Commit** `feat(zaku): record the keys each library item references`

### Task 6: The library check holds frames to their target and libraries to what they extend

**Files:**

- Modify: `packages/zaku/src/lib/domain/checks/library.ts`
- Test: `packages/zaku/src/lib/domain/checks/library.spec.ts`

**Interfaces:**

- Consumes: `snapshotsFor` and `libraryChain` from Tasks 1 and 3, and the item fields from Task 5.

- Behaviour on frames:
  - Each frame's instances are held to the variant keys of `snapshotsFor(input, frame.target)`.
  - A key found in another named library gives `${component} is from library ${other}, not from ${chain[0]}, which ${target.name} draws from`.
  - Any other key keeps today's message.
  - A map's `components` name passes when every target the screen resolves to (`resolveTargets`) has it in its snapshots.

- Behaviour on library snapshots: for each snapshot, every item reference is held to the union of the following.
  - Its own variant keys and component keys.
  - The variant keys of each library its chain extends.
  - For variables, its own `variableKeys` with `local: true`, and the keys the extended snapshots hold as `local: true`.
  - Their text style and effect style keys.
  - A miss gives `${component} ${variant} ${path}: ${kind} ${key} is neither the library's own nor from ${extends}`. `kind` is one of `instance`, `variable`, `text style`, `effect style`.
  - With an extended snapshot missing, the result is `notRun` naming it (Review Focus 2).

- [ ] **Step 1: Write the failing tests:**
  - `it('reports a Nova button on an iOS frame as from the wrong library')`: targets `ios-phone` to `zui-vega`, `web-desktop` to `nova`; snapshots nova, vega, zui-vega. The finding names `nova` and `zui-vega`.
  - `it('passes a Vega button on the iOS frame')`.
  - `it('reports a Nova variable left in a Vega library item')`: a zui-vega item whose `variableIds` holds an id with key `novaKey`. The finding kind is `variable`.
  - `it('reports a per-range fontFamily binding left on Nova')`.
  - `it('accepts an unpublished helper component of the file itself')` (Review Focus 4).
  - `it('does not run while an extended snapshot is missing')`.
  - The existing `figma.library` cases stay green.

- [ ] **Step 2: Run it and see it fail**
      Run: `cd packages/zaku && mise exec -- pnpm exec vitest run src/lib/domain/checks/library.spec.ts`

- [ ] **Step 3: Implement.** Keep the frame half and the snapshot half in two functions that the check concatenates.

- [ ] **Step 4: Run it and see it pass.**

- [ ] **Step 5: Commit** `feat(zaku): hold each frame to its target's libraries, each library to what it extends`

### Task 7: The font check per target

**Files:**

- Modify: `packages/zaku/src/lib/domain/checks/font.ts`
- Test: `packages/zaku/src/lib/domain/checks/font.spec.ts`

- [ ] **Step 1: Write the failing test:** `it('reports a Nova text style on a frame whose target draws from Vega')`. The message names both libraries, as Task 6's does.
- [ ] **Step 2: Run it and see it fail.**
- [ ] **Step 3: Implement** with `snapshotsFor` per frame.
- [ ] **Step 4: Run it and see it pass**, plus the whole `checks` directory and typecheck. Then rebuild `plugin-bin`.
- [ ] **Step 5: Commit** `feat(zaku): hold a frame's text styles to its target's libraries`

### Task 8: RED runs for both skill changes

These need two Figma files from the user, which the agent never creates:

- an empty product file;
- a fresh duplicate of ZUI (Nova), `iN1wQM8qXs9H5w0ExK4Zcy`.

**Files:**

- Create: `plugins/zaku/skills/building-the-library/test-moving-a-library-to-another-style.md`, `plugins/zaku/skills/drawing-a-screen/test-drawing-a-screen-for-two-libraries.md`
- Modify: both skills' `CREATION-LOG.md` (one line per test).

- [ ] **Step 1: Write the two scenario files.** Each holds its prompt, the setup and the pass criteria copied from the spec's Tests section.
  - The prompt is the bare task. It names no skill and pastes no skill body.
  - Moving: "This file is a copy of ZUI on Shadcn UI - Nova; make its components use Shadcn UI - Vega."
  - Two libraries: the product's `zaku.yaml` on Task 1's shape with both libraries, the decision record, and "draw sign-in for ios-phone and web-desktop".

- [ ] **Step 2: Run RED for each from a scratch directory**, against `git archive origin/master plugins/zaku` loaded with `--plugin-dir`, with the installed zaku turned off:
      `ENABLE_CLAUDEAI_MCP_SERVERS=false claude -p "$(cat prompt.md)" --model claude-opus-5-5 --output-format stream-json --verbose --plugin-dir <export>/plugins/zaku --settings '{"enabledPlugins":{"zaku@zaku":false}}' > red.jsonl`
      Expected: the run exits 0. Each test file records what the run missed against each criterion, read from the file, the screenshots and the log.

- [ ] **Step 3: Commit** the test files with RED filled in and GREEN reading `Not run`: `test(zaku): record RED for moving a library and drawing on two`

### Task 9: Skill edits, then GREEN

**Files:**

- Create: `plugins/zaku/skills/building-the-library/moving-a-library-to-another-style.md`. It holds spec decision 6's six steps, each with its reason. The fixed-size rule carries the 28 versus 20 example.
- Modify:
  - `plugins/zaku/skills/building-the-library/SKILL.md`:
    - "Before the first drawing" covers `figma.libraries`, `extends`, and the save per library.
    - "Tokens" says a style that rewrites component classes is one library per style.
    - The decision record names each target's input and the control heights against the touch target. A style the code does not ship yet is built from the registry, and the record says so.
    - One line names the procedure file and the moment to open it.
  - `plugins/zaku/skills/building-the-library/references/figma.md`: `zaku library save --library <name>`, and the export of an extending library.
  - `plugins/zaku/skills/drawing-a-screen/SKILL.md:44`: step 2.1 becomes "the library the frame's target names in `zaku.yaml`, and the ones it extends". A component one library lacks is added to that library, never borrowed.

- [ ] **Step 1: Write only what the RED runs got wrong.** Leave out any criterion RED already passed (`authoring-doctrine`).
- [ ] **Step 2: Check the limits** with `authoring-doctrine`'s commands: body at most 500 lines, description under 120 characters, no repository named in the body.
- [ ] **Step 3: Run GREEN** with Task 8's command against the worktree's `plugins/zaku`, on fresh copies of the same files.
      Expected: every criterion in both test files passes. The moving run ends with zero `library` findings, toolbar buttons at 32, Tab Bar icons at 20 and Code Input slots at 48. Record the results in the test files.
- [ ] **Step 4: Commit** `feat(zaku): one library per style, and moving a library to another style`. Push, and read the run the push starts before anything else.
