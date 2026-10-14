# zaku: a screen is drawn from the product's design system, which zaku finds, builds or proposes

## Why

On 2026-10-14 four runs drew one feature for two products: tour booking for travel, which has a
shadcn app whose `global.css` sets its own tokens, and bill payment for Sen Wallet, a wallet with no
brand yet. Two runs had zaku's skills and zaku-mcp; two had only the Figma MCP server.

- Both zaku runs refused to draw screens. travel got 26 grey wireframes and 4,045 findings, 4,007 of
  them raw values; Sen Wallet got a flow diagram. Each reply said the same thing: the skills want a
  library, the library wants a library file saved in the team, and there was none.
- Both Figma MCP runs drew real screens: travel's from the app's `global.css` turned into variables,
  Sen Wallet's from Nova's defaults. The second looks like every shadcn demo, because nothing chose a
  look for a wallet in Vietnam.
- The zaku runs were far stronger on everything before the drawing (profile, map, decision records,
  the State Bank rules), and the Figma MCP runs weaker, because the comparison switched the skills off
  with the tool. zaku-mcp and the Figma MCP server are two ways to reach the same file, and the skills
  are what makes the work right on either.

So three things are missing: a way to draw without a separate library file, a way to give a product
with no brand a design system, and skills that hold on either transport.

The `binding` check is not one of them. It passes any bound variable, a local one included
(`snapshot-rules.ts:108`); the 4,007 findings are the run drawing raw values because no variable
existed.

## Decisions

1. **A screen draws from the first source that exists, in this order**, and the reply names which:
   1. the library `zaku.yaml`'s `figma.library` names (today's path, unchanged);
   2. the design system the product's code already has: its token source (a theme CSS, a DTCG export,
      a theme object) once it holds values of the product's own, not only the UI kit's defaults. The
      library is built from that code, as `building-the-library` builds one now;
   3. a visual direction chosen for the product (decision 3), which first becomes the code's tokens and
      then the library, as in 2.

   A product never gets screens drawn from defaults it did not choose: a shadcn app still on its
   neutral defaults is a product with no brand, and goes to 3.

2. **The library may live in the product file.** When no library file exists, `building-the-library`
   builds into the product file, on the same pages and with the same documentation it draws in a
   library file, and `zaku.yaml`'s `figma.library` holds the product file's own key. Nothing else
   about the library changes: its components and variables still come from the code, it is still
   built in strict mode, and it is still read back against the code. It moves to a file of its own
   when a second product file needs it; the reply says so when a second file appears. The rule that
   no Figma file is created to fill a gap stays.
3. **A product with no brand gets a visual direction before its first screen**, from a new skill,
   `choosing-a-visual-direction`:
   1. It reads the profile (`profiling-a-product`): who the product is for, their markets, cultures,
      age, the task's stakes (money, safety, play) and the platforms.
   2. It researches the brand through `researching-a-claim`, from primary sources: what the product's
      competitors and its market's leaders look like, what colours and symbols mean to the audience
      and to the destination where they differ (red and gold in Vietnam, the chim Lac motif for
      travel), and what the platforms require (contrast, dynamic type, dark mode).
   3. It takes candidates from a data set zaku ships, of palettes, type pairings, radius and density
      scales, and styles, each row tagged with the domains and moods it suits and the source it came
      from. A row is a candidate, never a reason: every value the direction keeps is held against the
      profile and the research, and the record says why it fits this audience. A data set says
      "fintech: blue"; the audience decides whether that holds.
   4. It proposes two or three directions. Each is a set of DTCG tokens (colour roles in light and
      dark, type scale and families, radius, spacing, density, motion) and a voice for the copy, every
      text and UI colour pair checked against WCAG 2.2 (4.5:1 for text, 3:1 for UI parts), and a board
      per direction in the product file: its palette, its type, and one block of the feature drawn in
      it.
   5. The person picks one. A run nobody can ask (no one answers, or the prompt says not to ask) takes
      the one it recommends and marks it proposed in the reply and the record.
   6. The pick is written to the code's token source and to `docs/design/decisions/`, with the
      research and the data set rows it used, and the other directions with why they lost.
4. **The skills name no transport.** A skill says what is decided and what is checked; how to reach
   the file is in its tool reference, which spells each step for zaku-mcp and for the Figma MCP
   server side by side: a run, a read, a screenshot, a check. The checks a zaku-mcp run gets on every
   write reach a Figma MCP run as a script zaku prints (`zaku rules script`, as `zaku library script`
   prints the variables export now): the agent runs it through `use_figma` after a write, and
   `zaku check --input` reads what it returned. The script fits `use_figma`'s 50,000-character code
   limit and its reply fits the 20 KB a reply is cut at, or it is split by page.
5. **The two copy-rule faults the travel run found are fixed**, each with a failing test first: every
   script fails when `zaku.yaml` lists the ja, ko or zh locales, and the dong sign is flagged although
   `copy.currencies` lists VND (the second is the run's reading, to be reproduced before it is fixed).

## Out of scope

- A logo or illustration set: a direction names the mark's place and its colours; the mark is the
  brand's own asset, and `building-the-library` already says where it comes from.
- Generating images.
- Moving a product-file library into its own file; this spec only says when to.

## Tests

Skills are tested by runs, each RED before its skill edit and GREEN after, through `claude -p` from a
scratch directory with the criteria out of the run's reach:

- The 2x2 again, travel and Sen Wallet, each over zaku-mcp and over the Figma MCP server with zaku's
  skills enabled and its MCP tools refused, on four empty files. GREEN: all four draw real screens of
  every state the map names; travel's from its `global.css`, Sen Wallet's from a direction the run
  chose and recorded; the records hold research with sources, the data set rows used, and the
  contrast pairs; no Figma file is created; the rule checks ran on both transports and the reply
  claims nothing they contradict.
- A product whose code is a shadcn app on its neutral defaults goes to a visual direction, not to
  Nova's defaults.
- A run told not to ask picks its recommended direction and marks it proposed.

Code, written first and seen failing:

- `copy-rules`: a `zaku.yaml` listing ja, ko and zh loads, and a frame in those scripts passes; a frame
  showing the dong sign with VND in `copy.currencies` passes.
- `zaku rules script` prints a script under 50,000 characters, and `zaku check --input` reads its
  output into the same findings a zaku-mcp run gets for the same nodes.
- `zaku library save` reads a library from the product file's key.
