# Creation Log: reviewing-a-design

Drafted before its RED runs from the zaku core spec's candidates. After the runs, every rule whose
criterion the control arm already passed is cut and listed below.

## Source material

- Anthropic, "Harness design for long-running application development": agents grading their own work
  praise it, and a separate evaluator is easier to tune toward skepticism.
- Braintrust's design-agent runs: the number of self-check screenshots did not correlate with fidelity.
- Apple Human Interface Guidelines and Material Design 3 target sizes (44x44 pt, 48x48 dp); WCAG 2.2
  SC 2.5.8 (24x24 CSS px).
- Desktop target sizes, read on 2026-10-09: Apple HIG "Accessibility" (change log June 9, 2025: default
  control size 28x28 pt and minimum 20x20 pt on macOS; the iOS row's 44x44 pt is the same table's
  default column, so macOS takes 28); Microsoft Learn, "Guidelines for touch targets" (last updated
  2026-09-27: "7.5mm square range (40x40 pixels on a 135 PPI display at a 1.0x scaling plateau)");
  WCAG2ICT, W3C Group Note 11 December 2025: SC 2.5.8 "applies directly as written" to non-web software,
  "If the system supports a density-independent pixel measurement, it should be used in place of CSS
  pixels". The GNOME HIG ("Pointer & Touch": "Click targets should be large enough") and the KDE HIG
  state no size, so GNOME and KDE take WCAG2ICT's 24. A Group Note is informative, not a standard.

## What was refused

Pending the RED runs.

## What shipped on weak evidence

Pending the RED runs.

- The system bars row's desktop clause: no run; it follows the checker's desktop defaults.
- The Windows, GNOME and KDE target sizes: no run; only macOS was scored.
- The way out row: no review run. It holds the drawing to `mapping-a-feature`'s way out rule, which a
  recorded session licensed: a plugin panel shipped with a "Not connected" state that offered no
  action, and nothing in the review asked what a person does in each state.

## Tests

- `test-reviewing-a-screen.md`: RED three runs (criterion 2 failed in all), GREEN not run.
- `test-reviewing-your-own-drawing.md`: RED not run, GREEN not run.
- `test-reviewing-target-size-on-a-mac-frame.md`: RED three runs per arm (control failed criterion 1 in
  all three, taking the 20x20 pt minimum; the skill arm passed by analogy and named the missing row),
  GREEN three runs (both pass in all, read off the row).

## Iterations

1. Drafted from the spec's candidates.
2. Every name and place a drawing tool spells moved out of the body into the tool references, and
   `references/sketch.md` added from the Sketch docs and the Sketch MCP guide: the body had written
   Figma's terms (the state Section, image fills) as the decision, and Sketch spells them differently or lacks them.
3. `references/sketch.md` removed with the Sketch reader in the checker: a skill-arm run on Sketch
   2026.3.1 built a library the user judged far below the Figma one, and the team will not maintain or
   check a second tool. The body stays tool-neutral; Figma is its only reference.
4. The target size row names a size for macOS, Windows, GNOME and KDE, and the system bars row a
   desktop window's bar, after `test-reviewing-target-size-on-a-mac-frame.md` RED.
5. A way out row, decided from the images and graded High beside way back, after `mapping-a-feature`
   gained its way out rule.
