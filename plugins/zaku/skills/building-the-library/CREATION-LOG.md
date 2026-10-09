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

## What was refused

Pending the RED runs.

## What shipped on weak evidence

- The pages, the documentation components, the two frames per component and their sections. The user
  found the library built for the Sketch bench (masters only: one Button variant, no states, no modes,
  no documentation) unlike the Figma library and asked for the skill to carry the Figma library's
  layout. No run has yet measured an agent building a library with or without these sections.

- The icon colour in item 2. Two real sessions drew a library button whose label was white and whose
  prefix icon was black, and nothing compared the icon's colour with the code. `zaku check` now reads an icon instance's glyph colour and holds
  it to the colour the recipe page computes for that icon part. No run has measured the skill line.

## Tests

- `test-fixing-a-library-button.md`: RED not run, GREEN not run.
- `test-building-a-library-from-code.md`: RED not run, GREEN not run.

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
