# Creation Log: writing-a-design-component

Drafted before its RED runs from the zaku core spec's candidates. Its rules mirror the code-side
rules for writing a component and structuring a frontend app on purpose, so that a component has one name
and one shape in the code and the drawing. After the runs, every rule whose criterion the control arm
already passed is cut and listed below.

## Source material

- Figma Help Center, "Use slots to build flexible components in Figma"; Figma Plugin API updates of
  2026-06-10 (slots generally available, `SlotNode`, `createSlot`, `SlotSettings`).
- Figma Plugin API reference: `combineAsVariants`, `addComponentProperty`, `componentPropertyDefinitions`.
- Figma Forum feature requests for collapsible page groups, which show that pages do not nest.

- Sketch docs, "Symbols" (a slash in a name groups it; a group shows from two members); the Sketch MCP
  guide, topics `use` and `symbols` (Symbol Sources on the Symbols page, the override kinds); the
  Sketch 2026.3 JavaScript API, whose `SymbolMaster` exposes no description.

## What was refused

Pending the RED runs.

## What shipped on weak evidence

Pending the RED runs.

## Tests

- `test-making-a-repeated-block-a-component.md`: a code row drawn as one named component with its
  mapping lines, an image and no overrides: RED not run, GREEN not run.
- `test-migrating-a-screen-to-every-target.md` and `test-migrating-a-screen-of-cards.md` score whether
  repeated blocks became components: RED not run, GREEN not run.

## Iterations

1. Drafted from the spec's candidates.
2. Every name and place moved out of the body into the tool references, and `references/sketch.md`
   added: the body had written Figma's property types, Sections, page names and `DS/Header` as the
   decision, and Sketch names variants, holds properties and places components differently.
3. `references/sketch.md` removed with the Sketch reader in the checker: a skill-arm run on Sketch
   2026.3.1 built a library the user judged far below the Figma one, and the team will not maintain or
   check a second tool. The body stays tool-neutral; Figma is its only reference.
