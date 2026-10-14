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

Not run.
