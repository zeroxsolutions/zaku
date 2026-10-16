# choosing-a-visual-direction: creation log

## Measured against

- WCAG 2.2, success criteria 1.4.3 (contrast minimum, 4.5:1 for text) and 1.4.11 (non-text contrast,
  3:1 for UI components).
- `references/directions.md`'s rows, each with its own source.

## Tests

- `test-giving-a-wallet-its-look.md`: RED two runs (both fail every criterion: one drew on the kit's
  defaults, one drew no screens), GREEN two runs (Figma's server passes 1 to 6; zaku's server fails 1
  and 5), GREEN after iteration 2 not run.

## Iterations

1. Written after the RED: neither run chose a look for a product with no brand, and nothing in the
   plugin told them to.
2. The Iron Law, two rationalization rows and red flags added after the GREEN run over zaku's server
   read the skill and still gave two of its three directions only a primary colour and drew no board.
   Criterion 4 of the test now names DTCG files as the token source where the app has no stylesheet:
   the skeleton both GREEN runs read holds only `package.json` files, so the stylesheet it named could
   not exist, and both runs wrote the DTCG files the skill prescribes for that case.
