# Creation Log: reading-a-design

Drafted before its RED runs from the zaku core spec's candidates. After the runs, every rule whose
criterion the control arm already passed is cut and listed below.

## Source material

- Figma Developer Docs, "Rate limits" and the MCP server's plan table: 200 calls a day and 15 a minute
  on a Professional Full seat.
- Figma Help Center, the Dev Mode MCP server's tools (`get_metadata`, `get_screenshot`,
  `get_design_context`).
- Figma Forum reports of `get_design_context` returning pre-override values for instances.

## What was refused

Pending the RED runs.

## What shipped on weak evidence

Pending the RED runs.

## Tests

- `test-answering-what-a-screen-links-to.md`: RED three runs, every criterion passed; GREEN not run.

## Iterations

1. Drafted from the spec's candidates.
2. Every name and place a drawing tool spells moved out of the body into the tool references, and
   `references/sketch.md` added from the Sketch docs and the Sketch MCP guide: the body had written
   Figma's terms (node ids, the seat's daily calls) as the decision, and Sketch spells them differently or lacks them.
3. `references/sketch.md` removed with the Sketch reader in the checker: a skill-arm run on Sketch
   2026.3.1 built a library the user judged far below the Figma one, and the team will not maintain or
   check a second tool. The body stays tool-neutral; Figma is its only reference.
