# Test: giving a wallet with no brand its look

## Prompt

Each run is `claude -p --model claude-opus-5-5 --output-format stream-json --verbose
--dangerously-skip-permissions`, with `ENABLE_CLAUDEAI_MCP_SERVERS=false`, from its own clone of the
product in a scratch directory, the prompt as the argument. The arm's `.claude/settings.json` enables
gundam, superpowers, figma and zaku. A zaku arm reaches the file through zaku's server, with the panel
open and paired; a Figma arm refuses zaku's tools (`--disallowedTools=mcp__plugin_zaku_zaku`). Each
run draws into its own empty Figma file. The scoring criteria are kept outside every arm.

The task, verbatim with the file URL in place:

```
Add paying a bill to this product: a user pays a monthly bill from their wallet. Design the payment flow for the product's phone users and its desktop users, and draw it in the Figma file open right now: <file URL> . Do not ask me questions; decide, and report what you designed, why, and where it is in the file.
```

## Inputs

A README (a Vietnamese e-wallet, phone first, desktop web second) and skeleton `apps/web`,
`apps/mobile` and `packages/api`; the web app is shadcn on its neutral defaults. No brand, no
`docs/design/`, no Figma library. The team has Nova, Simple Design System, Apple's iOS kit and Google's
Material 3 kit enabled.

## Pass criteria

1. `docs/design/decisions/visual-direction.md` holds two or three directions, each with its tokens, its
   voice, the data set rows it took (by table and row) and why each fits the profile.
2. Every text and UI colour pair of the chosen direction is listed with its ratio, at least 4.5:1 for
   text and 3:1 for UI parts.
3. Every claim about the audience's colour meanings and the market's conventions cites a primary
   source.
4. The chosen direction is in the code's token source (the web app's stylesheet, or DTCG files
   `zaku.yaml` names where the app has none), and `zaku tokens` and `zaku check` ran on it.
5. The product file has a board per direction, and the screens use the chosen direction's variables,
   not the kit's defaults.
6. The reply says the direction was proposed, because nobody could be asked.

## RED

Two runs on the plugin before this skill existed.

- Figma's server: 45 frames on Nova's defaults with an indigo primary; no direction, no record of a
  look, "the design system (Shadcn UI Nova)" in `zaku.yaml`. Fails 1 to 6.
- zaku's server: a flow diagram and no screens, "Test 2 has no Sen Wallet design system: no
  components, colour tokens or text styles." Fails 1 to 6.

## GREEN

Two runs on the skill as written, each into its own empty file, the criteria out of reach. The
skeleton's `apps/web` holds no stylesheet, so criterion 4 is met by DTCG files `zaku.yaml` names, the
skill's own branch for that case.

- Figma's server: three directions (Lotus leaf, Lotus flower, Jade blue), each with its primary in
  light and dark, its family, its radius steps and its voice, and the data set rows it took; nine
  pairs of the proposed one with their ratios; Minina 2021, MoMo's branding guideline and ZaloPay's
  press release cited; DTCG files named by `zaku.yaml`, `zaku tokens` and `zaku check` run; a board
  per direction on `Visual direction`; the reply and record say proposed. Passes 1 to 6.
- zaku's server: three directions in the record, but Ledger blue and Lucky red carry one primary
  colour each, no tokens beyond it, no voice and no data set row; twelve pairs of the proposed one
  with their ratios; the same sources with a DOI; DTCG files, `zaku tokens` twice and `zaku check`;
  no board for any direction ("The direction boards for B and C were not drawn"). Fails 1 and 5.

After the Iron Law, its rationalization rows and the red flags: Not run.
