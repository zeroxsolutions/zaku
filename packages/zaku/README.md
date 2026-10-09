# @zeroxsolutions/zaku

The design checker behind the zaku plugin. It reads a product's `docs/design/`, outlines the frames
drawn in Figma, and decides whether a design change is right. Every finding names its node
id.

## Run

The plugin runs the bundled `plugins/zaku/bin/zaku.mjs` with Node 22 or later, so a hook or a skill
needs no install. A product's CI, where the plugin is not installed, runs the same file or the package.

## Files

| Path                                          | Written by          | Holds                                                                              |
| --------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------- |
| `docs/design/zaku.yaml`                       | hand                | the targets, the Figma file keys, the design system, its modes, the call budget    |
| `docs/design/map/<feature>.yaml`              | hand                | screens, states, targets, navigation, components                                   |
| `docs/design/outline/<feature>/<screen>.yaml` | `zaku outline`      | each frame reduced to library instances, overrides, copy, pictures and links       |
| `docs/design/library.json`                    | `zaku library save` | each library variant item by item, per mode                                        |
| `docs/design/tokens.json`                     | `zaku tokens`       | the stylesheet's tokens, DTCG 2025.10                                              |
| `docs/design/recipe.json`                     | `zaku recipe`       | what a browser computed for each code variant, read from the product's recipe page |

`zaku schema` writes `zaku.schema.json` and `map.schema.json` for an editor.

## Commands

| Command                                                    | Does                                                                                                                                                                                                         | Exit                                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `zaku check [--json]`                                      | runs every check over the files above                                                                                                                                                                        | 0 all passed, 1 a finding or an invalid file, 2 a check could not run |
| `FIGMA_TOKEN=... zaku outline [--frames 1:2,1:3]`          | rereads the named frames, or every frame when the file, a map or the library changed                                                                                                                         | 0                                                                     |
| `zaku tokens [--css src/app/global.css]`                   | writes `tokens.json` from the design system `zaku.yaml` names: a shadcn preset, decoded with `shadcn@4.21.3`, and the stylesheet's `:root` and `.dark` (`--css` required); or DTCG token files or a resolver | 0                                                                     |
| `zaku recipe [--url <page>]`                               | opens the product's recipe page in Chromium, in light and dark, with Playwright loaded from the product, and reads each marked part's computed style                                                         | 0; 2 the page could not be read; 3 no URL or no Playwright            |
| `zaku library script`                                      | prints the Plugin API code that exports the library's variables, for `use_figma`                                                                                                                             | 0                                                                     |
| `FIGMA_TOKEN=... zaku library save --input variables.json` | reads the published components over REST and resolves them per mode from that export                                                                                                                         | 0                                                                     |
| `zaku budget status`                                       | reports the day's and the run's MCP calls                                                                                                                                                                    | 4 when the day's reserve or the run's ceiling is reached              |
| `zaku budget record --kind <mcp\|rest> --count <n>`        | adds calls to the ledger                                                                                                                                                                                     | 0                                                                     |

Every command takes `--root <dir>`, `docs/design` by default. A usage error exits 3. `ZAKU_SEAT` and
`ZAKU_RUN` name the seat and the run the ledger counts.

## Figma calls

A `use_figma` reply is cut at 20 KB, so the library export carries only the semantic tokens, and the
components come over REST, which names each bound variable. Every REST call is counted in
`~/Library/Caches/zaku/ledger.json` (or `$XDG_CACHE_HOME/zaku`). A 429 is waited out once, for at most
120 seconds, and then reported. A Professional Full seat has 200 MCP calls a day, and
`zaku budget status` refuses once 80% of them are spent or a run has used 30.

## Develop

From the repository root: `pnpm nx run-many -t lint typecheck build test` is the gate, and
`pnpm nx run @zeroxsolutions/zaku-cli:plugin-bin` rebuilds `plugins/zaku/bin/zaku.mjs`, which is
committed with every change to the source.
