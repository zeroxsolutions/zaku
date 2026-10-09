# Creation Log: prototyping-a-flow

Drafted before its RED runs from the zaku core spec's candidates and the research note
ux-psychology-motion-prototyping.md. No scenario exercises it yet; one is written before it ships.

## Source material

- Material Design 3, "Easing and duration" and "Transitions"; the token values as material-web 34.0.21
  generates them.
- Apple Human Interface Guidelines, "Motion"; WCAG 2.2 SC 2.2.2 and 2.3.3.
- Figma Help Center, "Smart Animate", "Interactive components", "Prototype flows"; Plugin API
  `setReactionsAsync`, `flowStartingPoints`, `Transition`.

## What was refused

Pending the RED runs.

## What shipped on weak evidence

Pending the RED runs.

## Tests

- `test-wiring-a-feature-flow.md`: a start point, an exit connection and a Back action per target,
  each transition named with its tokens: RED not run, GREEN not run.

## Iterations

1. Drafted from the spec's candidates.
2. Every name and place a drawing tool spells moved out of the body into the tool references, and
   `references/sketch.md` added from the Sketch docs and the Sketch MCP guide: the body had written
   Figma's terms (overlay, Smart Animate, main component, the Motion Section; the Material 3 tokens moved into the body, being Material's and not a layer's) as the decision, and Sketch spells them differently or lacks them.
3. `references/sketch.md` removed with the Sketch reader in the checker: a skill-arm run on Sketch
   2026.3.1 built a library the user judged far below the Figma one, and the team will not maintain or
   check a second tool. The body stays tool-neutral; Figma is its only reference.
