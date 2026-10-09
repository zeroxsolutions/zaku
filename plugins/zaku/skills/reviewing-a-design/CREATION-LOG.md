# Creation Log: reviewing-a-design

Drafted before its RED runs from the zaku core spec's candidates. After the runs, every rule whose
criterion the control arm already passed is cut and listed below.

## Source material

- Anthropic, "Harness design for long-running application development": agents grading their own work
  praise it, and a separate evaluator is easier to tune toward skepticism.
- Braintrust's design-agent runs: the number of self-check screenshots did not correlate with fidelity.
- Apple Human Interface Guidelines and Material Design 3 target sizes (44x44 pt, 48x48 dp); WCAG 2.2
  SC 2.5.8 (24x24 CSS px).

## What was refused

Pending the RED runs.

## What shipped on weak evidence

Pending the RED runs.

## Tests

- `test-reviewing-a-screen.md`: RED three runs (criterion 2 failed in all), GREEN not run.
- `test-reviewing-your-own-drawing.md`: RED not run, GREEN not run.

## Iterations

1. Drafted from the spec's candidates.
2. Every name and place a drawing tool spells moved out of the body into the tool references, and
   `references/sketch.md` added from the Sketch docs and the Sketch MCP guide: the body had written
   Figma's terms (the state Section, image fills) as the decision, and Sketch spells them differently or lacks them.
3. `references/sketch.md` removed with the Sketch reader in the checker: a skill-arm run on Sketch
   2026.3.1 built a library the user judged far below the Figma one, and the team will not maintain or
   check a second tool. The body stays tool-neutral; Figma is its only reference.
