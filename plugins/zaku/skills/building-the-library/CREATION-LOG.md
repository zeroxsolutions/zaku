# Creation Log: building-the-library

Drafted before its RED runs from the zaku core spec's candidates and the library built for the first
product. After the runs, every rule whose criterion the control arm already passed is cut and listed
below.

## Source material

- shadcn 4.21.3, `preset decode`, and its registry config (`menuAccent` bold sets accent to primary);
  its menu transform for `menuColor`.
- Figma pricing and Help Center: variable modes per collection by plan, the Variables REST API on
  Enterprise only, Code Connect on Organization and above.
- Figma Plugin API reference: `resolveForConsumer`, `setExplicitVariableModeForCollection`,
  `setBoundVariableForPaint`.
- The team's Figma library "Shadcn/UI - Nova", read whole on 2026-10-07 through the Plugin API: 70
  pages (cover, `Component for Docs`, two dividers, Icon, Typography, 61 component pages), the 8
  variable collections with their values and aliases, 12 text styles, the six documentation
  components, and the Button, Card, Typography and Icon pages node by node. The page order, the
  documentation components, the two frames per page, their sections, the `semantic` opacity and
  `mode/` variables and the cover are taken from it.
- Sketch docs, "Symbols" and "Color Variables" (a slash in a name groups it; a group shows from two
  members), "Renaming and replacing Libraries" (Replace Library swaps components of the same name and
  location, for dark and light modes); the Sketch MCP guide, topics `use`, `styling` and `symbols`
  (Symbol Sources on the Symbols page, the override kinds, Stack order); the Sketch 2026.3 JavaScript
  API, whose `Swatch` exposes only a name and a colour.

- A recorded session building an antd 6.6.5 library into an empty file with the zaku plugin, stopped
  by the user partway: its transcript, the files it wrote and the user's screenshot of the canvas.
  `test-a-first-library-pass-under-findings.md` holds it.
- Figma Plugin API reference: `figma.fileKey` ("Only private plugins and Figma-owned resources ...
  have access to this"), `figma.createFrame` ("parented under `figma.currentPage`"),
  `counterAxisSizingMode`.

- Tailwind CSS docs, "padding" (`padding: calc(var(--spacing) * <number>)`) and "Theme variables"
  (`--spacing: 0.25rem` in the default theme), for the `spacing/<step>` tokens.

## What was refused

- Pending the RED runs, for the rules drafted before them.
- Refusing `mode: "report"` in `execute` for library work. zaku-mcp cannot tell a library file from a
  product file (the plugin gets no file key), and report mode is zaku's own tool for any file. The skill
  holds library work to strict mode instead, and strict mode already returns every finding.
- A frame pinned to each mode, one per mode, for Dark. The reference already says no library frame sets
  a mode, because a pinned frame ignores the designer's switch. The Tags that read as Dark were Light
  Disabled variants on the editor's canvas; a view frame painted with the page surface answers it.
- Letting zaku's spacing rule accept a raw value that lies on the design system's scale when the library
  declares no spacing tokens. Tailwind's `calc(var(--spacing) * <number>)` takes fractional steps
  (`px-2.5`), so at a 4 px unit nearly every whole pixel is on the scale and the rule would pass anything.
  The library holds a token per step instead, and the rule stays as it is.
- A check on the shape of the key in `zaku.yaml`. Figma does not publish the key's format, and a
  wrong but well-formed key would pass it; step 0 is a rule in the body.

## What shipped on weak evidence

- The pages, the documentation components, the two frames per component and their sections. The user
  found the library built for the Sketch bench (masters only: one Button variant, no states, no modes,
  no documentation) unlike the Figma library and asked for the skill to carry the Figma library's
  layout. No run has yet measured an agent building a library with or without these sections.

- The icon colour in item 2. Two real sessions drew a library button whose label was white and whose
  prefix icon was black, and nothing compared the icon's colour with the code. `zaku check` now reads an icon instance's glyph colour and holds
  it to the colour the recipe page computes for that icon part. No run has measured the skill line.
  Carbon states the same practice: its Button usage page, "Icons must match the color value of the
  label within a button", and its Icons usage page (last updated Aug 12, 2026), "match your icon color
  with your text color when pairing them".

- The Iron Law, its rationalization table and red flags, the step before the first drawing, the order
  of drawing an entry and the reply's REQUIRED lines answer one recorded session, not a RED run: no
  drawing run on a live file has reproduced them, and none has measured them.
- The reference's line that a wrapping set resized after it was set to hug stays at the resized
  height: the recorded set did; Figma's reference for `resize` does not say it.

- Figma refusing `.` in a variable's name rests on Figma's community forum; the Help Center was not
  found saying it.

## Tests

- `test-fixing-a-library-button.md`: RED not run, GREEN not run.
- `test-building-a-library-from-code.md`: RED not run, GREEN not run.
- `test-a-first-library-pass-under-findings.md`: RED is the recorded session; description runs without
  Figma, three per arm (control, the skill before, the skill after); GREEN on Figma not run.
- `test-binding-a-shadcn-buttons-spacing.md`: RED 3 runs, the names and steps differed in each; GREEN 3
  runs, all `spacing/<step>` with `_` for `.`; no run on Figma.

## Iterations

1. Drafted from the spec's candidates.
2. The library's layout added from the Nova library: pages, documentation components, the
   component and Guidance frames, the component set's State axis, `semantic` opacity and mode
   variables, text styles, the icon and typography pages, the cover.
3. Every name and place moved out of the body into the tool references, and `references/sketch.md`
   added: Figma and Sketch name variants, group components and switch themes differently, and the
   first draft wrote Figma's names as the decision. The body's lines on `zaku library` commands were
   cut: no such command exists yet.
4. The cover no longer pinned to Dark: the user switched the Nova cover's page to Light and saw nothing
   change, because the cover frame set Dark on itself, which overrides the page. The Nova cover's own
   pin was removed the same day.
5. `references/sketch.md` removed with the Sketch reader in the checker: a skill-arm run on Sketch
   2026.3.1 built a library the user judged far below the Figma one, and the team will not maintain or
   check a second tool. The body stays tool-neutral; Figma is its only reference.
6. From a recorded session: the step before the first drawing (the file's key in `zaku.yaml`), the
   Iron Law on strict mode with its rationalizations and red flags, the order of drawing an entry, and
   the reply's REQUIRED lines. In the checker, in the same change: a text style a script creates is no
   longer read as an unstyled text node (the session's "false positive" was one); documentation on the
   reference's pages is not held to the spacing and text-style rules; a set placed on an entry page
   outside its view is `placement`, and a variant over another or past its set's edge is `overlap`.
7. The `spacing/<step>` token, one per step the code's classes use, and its spellings in the Figma,
   shadcn and DTCG references: zaku's checks refuse a raw padding, and the token table had no spacing
   row, so each description run invented a different shape for it.
8. From a GREEN run on a live file: with no product file, the run created a new Figma file in the
   user's team because `zaku.yaml`'s schema required `figma.product` beside `figma.library`. Both keys
   are optional now, each command that reads one refuses naming the field, and the step before the
   first drawing says no Figma file is created; a missing one is asked for. The same run stopped on a
   `naming` finding against the `Component` section frame the reference prescribes, which the checker
   now reads by node type.
9. From a GREEN run on a live file: the documentation components were drawn from a reference that gave
   their measures but not their properties, placeholders, places on the page or the matrix head, so
   the run guessed each, and it held the page header back until the Tag existed. The reference now
   names every documentation component with its properties and defaults, its place on the page and
   its layers, adds the matrix head and the component view's Matrix section that uses it, and says the
   header is drawn first with its badge row empty, the Badge placed into it once its set exists. In
   the checker, in the same change: documentation may size the instances it lays out (a table's head
   and cell to its column), and the plugin's rollback no longer removes a node an earlier run made
   when the rolled-back run had moved it into a node of its own.
