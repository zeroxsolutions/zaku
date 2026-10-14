# Figma: choosing a visual direction

What has to survive a swap of drawing tool: one board per direction in the product file, each showing
its palette, its type ramp and one block of the feature, drawn in that direction's own variables, so
the person compares directions as they would ship.

## The boards

The boards sit on a page named `Visual direction`, one frame per direction, left to right 160 apart,
each 1440 wide and hugging its content, named `Direction / <name>`. Each holds, top to bottom:

1. the direction's name and its voice lines, as text;
2. the palette: one swatch per colour role, 96 x 96, its fill bound to the role's variable, its role
   name and its hex beneath it, light and dark side by side;
3. the type ramp: one line per step of the scale, in the direction's families, the step's name and
   size beside it;
4. one block of the feature (a card, a form or a list the map names), drawn in the direction's
   variables.

Each direction is a mode of one variable collection named `direction`, so every board binds the same
variables and sets its own mode with `setExplicitVariableModeForCollection`. The collection holds the
spacing steps too, and each direction's type scale is a set of text styles named
`<direction>/<step>`, so every fill, padding, gap and text on a board is bound and the rules pass a
board as they pass a screen. The picked direction's values and styles become the library's; the
collection and the other directions' styles are removed once the library holds them.

## Reaching the file

| Step           | zaku's server                  | Figma's server                                                                                                    |
| -------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Draw a board   | `run_script`, `mode: "strict"` | `use_figma`, then the rules script for the `Visual direction` page                                                |
| Check the page | `check_rules`, `scope: "page"` | `zaku rules script --page "Visual direction"` through `use_figma`, its answer read by `zaku check --input <file>` |
| Render a board | `get_screenshot`               | `get_screenshot`                                                                                                  |

A font is loaded with `figma.loadFontAsync` before any text is set in it; a family Figma does not
have is named in the reply, and the board says which family stands in.
