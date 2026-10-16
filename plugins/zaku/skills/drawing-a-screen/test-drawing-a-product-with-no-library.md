# Test: drawing a feature for a product whose file has no library

## Prompt

Each run is `claude -p --model claude-opus-5-5 --output-format stream-json --verbose
--dangerously-skip-permissions`, with `ENABLE_CLAUDEAI_MCP_SERVERS=false`, from its own clone of the
product in a scratch directory, the prompt as the argument. The arm's `.claude/settings.json` enables
gundam, superpowers, figma and zaku. A zaku arm reaches the file through zaku's server, with the
panel open and paired; a Figma arm refuses zaku's tools (`--disallowedTools=mcp__plugin_zaku_zaku`)
and reaches the file through Figma's server. Each run draws into its own empty Figma file. The
scoring criteria are kept outside every arm.

The two tasks, verbatim with the file URL in place:

```
Add booking a tour to this product: a traveller picks a tour from a place's page and pays for it. Design the payment flow for the product's phone users and its desktop users, and draw it in the Figma file open right now: <file URL> . Do not ask me questions; decide, and report what you designed, why, and where it is in the file.
```

```
Add paying a bill to this product: a user pays a monthly bill from their wallet. Design the payment flow for the product's phone users and its desktop users, and draw it in the Figma file open right now: <file URL> . Do not ask me questions; decide, and report what you designed, why, and where it is in the file.
```

## Inputs

- The travel product: a monorepo whose web app is shadcn (`base-nova`) with its own tokens in the
  app's `global.css`; no `docs/design/zaku.yaml`, no Figma library.
- The wallet product: a README (a Vietnamese e-wallet, phone first, desktop web second) and skeleton
  `apps/web`, `apps/mobile` and `packages/api`; the web app on shadcn's neutral defaults; no brand.
- The team has Nova, Simple Design System, Apple's iOS kit and Google's Material 3 kit enabled.

## Pass criteria

1. Real screens of every state the map names, on every target, not wireframes or a diagram.
2. The reply names which design system source the screens were drawn from, and it is the first that
   exists: travel's from its `global.css` tokens, the wallet's from a direction chosen and recorded.
3. No library the team happens to have enabled is drawn with unless `zaku.yaml` names it.
4. The rules ran over every page drawn, on the transport the run used, and the reply claims nothing
   they contradict.
5. No Figma file is created.

## RED

Four runs on the skill as it stood before this change.

- travel, zaku's server: 26 grey wireframe frames, "The file has no component library, so every frame
  is built from plain shapes and text". 4,045 findings, 4,007 raw values. Fails 1, 2.
- wallet, zaku's server: a flow diagram, "Test 2 has no Sen Wallet design system ... So the diagram is
  plain shapes and text and is not for engineering to build from." Fails 1, 2.
- travel, Figma's server: 38 frames drawn with Simple Design System, "the app uses shadcn, which isn't
  in this file, so I drew with Simple Design System"; "`zaku outline` and `zaku check` aren't
  installed on this machine". Fails 2, 3, 4.
- wallet, Figma's server: 45 frames on Nova's defaults; `zaku check` "48 findings, 8 checks not run",
  45 of them "no frame drawn" for want of a `FIGMA_TOKEN`. Fails 2, 4.

## GREEN

Four runs on the skill after this change, each into its own empty file, the criteria out of reach.
A run that met a usage limit was resumed in its own session; its numbers add up every session.

- travel, zaku's server: 30 frames, 15 states on 2 targets, the library rebuilt from `global.css` and
  the app's components into the product file, `library.json` saved. Passes 1 to 5. `check_rules` ran
  16 times, 6 of them timing out on the screens page; the reply names the findings left and says
  `zaku check` counted all 30 frames missing, which was zaku's outline rejecting slot values. 169
  `run_script` calls, 27 failed (18 rolled back for a script error, 6 checks timed out, 1 read
  `mainComponent`); about 52.80 USD over three sessions, one of them lost to a background agent the
  resume could not reach.
- wallet, zaku's server: 45 frames, 5 screens and every state on 3 targets, drawn from the direction
  the run proposed. Passes 1 to 5. Strict mode checked every write and `check_rules` ran 3 times; the
  reply reports 186 findings left, which were the sizing modes Figma records on a filling instance.
  33 `run_script` calls, 1 failed; 11.46 USD.
- travel, Figma's server: 34 frames, 17 states on 2 targets, from the app's `global.css`. Passes 1 to 5. The rules script ran 13 times; the reply reports 12 findings left, the same sizing modes. 22
  `use_figma` calls, 5 failed; 33.11 USD over two sessions.
- wallet, Figma's server: 51 frames, 17 states on 3 targets, from the direction the run proposed.
  Fails 4: the rules script ran three times, each on the screens page, and never on the 17 library
  pages the run wrote. 20 `use_figma` calls, 3 failed; 11.90 USD.

Every run drew its screens; none drew with a kit's or another library's components outside the system
bars `zaku.yaml` lists, and none created a file. The sizing-mode findings, the slot values and the
check that timed out were zaku's, and are fixed beside this record; the wallet run over Figma's server
is run again after `building-the-library`'s red flag for an unchecked library page: Not run.
