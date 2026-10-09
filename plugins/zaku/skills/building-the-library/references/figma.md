# Figma: building the library

What has to survive a swap of drawing tool: one token axis per choice the design system offers, a semantic layer with
Light and Dark that components use, values read per item and per mode as the tool resolves them, and
an entry per component built from the documentation components.

## The library file and its key

The key is the part of the file's address after `/design/`: in
`https://www.figma.com/design/<key>/<name>`, `<key>`. The plugin cannot read it, because the Plugin
API gives `figma.fileKey` only to private plugins, so it comes from the person, from the address of a
file saved in the team. `figma.library` in `zaku.yaml` holds it before the first drawing.

## Drawing an entry

- Every `figma.create*()` call puts its node on `figma.currentPage`, and the current page follows the
  page the person opens while a script runs. A script that draws an entry looks the entry's page up by
  name and appends each node it makes to its parent there, before it returns.
- The views are two frames appended to the entry's page; the set is made with
  `figma.combineAsVariants(components, demoCard)`, its parent the Component section's `Preview` (or
  the `Matrix` frame inside it), never the page.
- A set that wraps its variants fixes its width and hugs its height (`counterAxisSizingMode =
  'AUTO'` on a horizontal set). Set the hugging axis after the last `resize()`, then read the set's
  height back: a wrapping set resized to 100 high after it was set to hug stays 100 high and cuts off
  its second row.
- Variants placed by hand in a `Matrix` sit apart, with the gaps the `Preview` rows give, and the set
  is resized to enclose them.

## Pages and names

| Part                     | Page                                  | Names                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------ | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| cover                    | `Thumbnail`                           | one frame `Thumbnail`, 1200 x 675, measured below                                                                                                                                                                                                                                                                                                                                                                                  |
| documentation components | `Component for Docs`                  | `DS/Header`, `DS/Section Heading`, `DS/Table Head`, `DS/Table Cell`, `DS/List Item`                                                                                                                                                                                                                                                                                                                                                |
| divider                  | `-`                                   | nothing                                                                                                                                                                                                                                                                                                                                                                                                                            |
| icon set                 | U+2756, a space, `Icon`               | one 1440-wide view named `Icons`: a `DS/Header`, then a `Body` holding one section per set, named `<Icon set> / Icons` (`Lucide / Icons`), with a `Heading` titled the same and a frame `Icons (<package>)` holding the icon components `<icon set>/<name>` (`lucide/bell`) themselves, not instances, in a grid ten across, 120 apart, each over its name in the muted style; no icon component sits on the page outside the view |
| typography               | U+2756, a space, `Typography`         | frames `<Style> / Typography` and `<Style> / Typography / Guidance`, as a component's; the set `Typography`, variants `Variant=<name>`, inside the first                                                                                                                                                                                                                                                                           |
| divider                  | `---`                                 | nothing                                                                                                                                                                                                                                                                                                                                                                                                                            |
| a component              | U+2756, a space, the component's name | frames `<Style> / <Component>` and `<Style> / <Component> / Guidance` (`Nova / Button`)                                                                                                                                                                                                                                                                                                                                            |

- Figma draws a page named only of dashes as a divider in the pages panel; pages do not nest.
- A component's sets live on its own page, inside the Component section of its component frame, so the
  assets panel groups them by page.
- The two frames sit side by side, 80 apart. The header is a `DS/Header` instance, the body a frame
  named `Body`, each section a frame named for the section opening with a `DS/Section Heading`
  instance named `Heading`. Every one of them is a vertical auto-layout (`figma.createAutoLayout`).
- A slash in a component's name groups it in the assets panel: `DS/` keeps the documentation
  components together, `lucide/` the icons.

## The documentation's measures

Every library draws its documentation to these measures, whatever its design system's own sizes:
the documentation is zaku's frame around the library, so its type and spacing never come from the
design system's tokens, and a reader moving between two libraries finds every header, table and card
where the last one was. Only the colours come from the library, each bound to the role named here (a
design system without one of these roles binds its nearest: its page surface, its text, its secondary
text, its divider, its subtle fill, its card surface), and only the family: the library's sans, in the
weights below. A view's frame fills with the page surface; `Body` and every section frame have no fill.

| Part                                            | Layout                                                               | Size                                                                      | Text and paint                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DS/Header`                                     | horizontal, padding 48 40 40 40, gap 48, space between, items bottom | 1440 wide, hugs 193 high                                                  | fill `color/background`; bottom stroke 1 `color/border`                                                                                                                                                                                                                                                                                                 |
| `Glow`, absolute behind the header              | two ellipses, `GRADIENT_RADIAL` in the primary role                  | 900 x 420 at 820, -170, opacity 0.28; 560 x 300 at 1120, 10, opacity 0.22 |                                                                                                                                                                                                                                                                                                                                                         |
| `Title block`                                   | vertical, gap 12                                                     | hugs                                                                      |                                                                                                                                                                                                                                                                                                                                                         |
| `Eyebrow`                                       |                                                                      |                                                                           | Regular 14 / 20, `color/muted-foreground`; `Foundations` for the icon set, `Components` for every entry, Typography included                                                                                                                                                                                                                            |
| `Title`                                         |                                                                      |                                                                           | Extra Bold 36 / 40, tracking -2.5, `color/foreground`                                                                                                                                                                                                                                                                                                   |
| `Badges`                                        | horizontal, gap 8                                                    | hugs                                                                      | one instance of the library's Badge, secondary variant: padding 2 8, 20 high                                                                                                                                                                                                                                                                            |
| `Description`                                   |                                                                      | 480 wide                                                                  | Regular 16 / 28, `color/muted-foreground`                                                                                                                                                                                                                                                                                                               |
| `Body`                                          | vertical, padding 48 120 96 120, gap 64                              | 1440 wide                                                                 | no fill                                                                                                                                                                                                                                                                                                                                                 |
| a section                                       | vertical, gap 24                                                     | 1200 wide                                                                 | no fill                                                                                                                                                                                                                                                                                                                                                 |
| `DS/Section Heading`                            | vertical, gap 8                                                      | 1200 wide, 81 high                                                        |                                                                                                                                                                                                                                                                                                                                                         |
| its `h2`                                        | vertical, padding bottom 8                                           | fills                                                                     | bottom stroke 1 `color/border`; `Title` Semi Bold 30 / 36, tracking -2.5, `color/foreground`                                                                                                                                                                                                                                                            |
| its `Description`                               |                                                                      | fills                                                                     | Regular 16 / 28, `color/muted-foreground`                                                                                                                                                                                                                                                                                                               |
| `Preview` (a demo card)                         | horizontal, wrap, padding 40, gap 48, row gap 24                     | 1200 wide                                                                 | fill `color/background`, stroke 1 `color/border`, radius 14                                                                                                                                                                                                                                                                                             |
| `Table`                                         | vertical                                                             | 1200 wide                                                                 | stroke 1 `color/border`, radius 8                                                                                                                                                                                                                                                                                                                       |
| `TableHeader`, `TableRow`                       | horizontal                                                           | 41 and 57 high                                                            | bottom stroke 1 `color/border`, none on the last row                                                                                                                                                                                                                                                                                                    |
| `DS/Table Head`                                 | vertical, padding 0 8, centred                                       | 40 high                                                                   | Medium 14 / 20, `color/foreground`                                                                                                                                                                                                                                                                                                                      |
| `DS/Table Cell`                                 | vertical, padding 8                                                  | hugs, 36 high for one line                                                | primary: Medium 14 / 20 `color/foreground`; muted: Regular 14 / 20 `color/muted-foreground`                                                                                                                                                                                                                                                             |
| `List`                                          | vertical, padding left 24, gap 8                                     | 1200 wide                                                                 |                                                                                                                                                                                                                                                                                                                                                         |
| `DS/List Item`                                  | horizontal, gap 10                                                   | fills, 28 high                                                            | `Bullet` and `Text` Regular 16 / 28, `color/foreground`                                                                                                                                                                                                                                                                                                 |
| `Cards` (Accessibility)                         | grid, two columns, gap 16                                            | 1200 wide, each card 592                                                  | the library's Card: padding 16 0, gap 16, fill `color/card`, radius 14                                                                                                                                                                                                                                                                                  |
| `Theme Preview`                                 | horizontal                                                           | 1200 wide                                                                 | one `Preview` frame holding the example, no mode of its own; the section's description says the theme follows the variable mode switched on the frame                                                                                                                                                                                                   |
| `Preview` (component view, one axis)            | vertical, gap 40, radius 14                                          | 1200 wide                                                                 | the set itself: vertical (horizontal, wrap, for variants narrower than a line), padding 32, gap 32, the dashed border Figma gives a set; no labels                                                                                                                                                                                                      |
| `Matrix` (component view, more than one axis)   | a frame with no auto layout inside `Preview`                         | 1200 wide                                                                 | the set at the right, its variants placed as the grid; column labels above it, Medium 12 / 16, `color/muted-foreground`; the first row axis's labels at the left edge, Medium 14 / 20, `color/foreground`; the next axis's labels right-aligned against the set, Regular 12 / 16, `color/muted-foreground`; every label a TEXT node named for its value |
| `Anatomy layout`                                | horizontal, gap 16                                                   | 1200 wide                                                                 | a `Preview` 744 wide, padding 24, holding the component, `Marker <n>` frames 24 x 24 and 1 px `Leader` lines; a `Cards` grid 440 wide, one Card per part                                                                                                                                                                                                |
| a demo row (`Variants`, `Sizes`, `Composition`) | horizontal, wrap, gap 12                                             | hugs                                                                      | inside the section's `Preview`                                                                                                                                                                                                                                                                                                                          |
| `Preview` of the Preview section                | vertical, padding 40, gap 20                                         | 1200 wide                                                                 | the `Variants` and `Composition` rows                                                                                                                                                                                                                                                                                                                   |

- The badge's text is an override of its `Label`.
- A text in the documentation that the library has a text style for at that size and weight uses the
  style; one it has none for (the 36 title) keeps its measures as written here.

## The cover

| Part            | Place and size                                              | Content                                                                                                                                                                                                                |
| --------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Glow`          | a frame filling the cover, behind everything                | three `GRADIENT_RADIAL` ellipses: the primary role 1000 x 760 at 520, -260; a second accent 560 x 460 at 820, -120; the primary again 760 x 520 at -280, 420                                                           |
| `Intro`         | vertical, at 72, 72, 464 wide, its foot 72 above the bottom | `Brand`, then `Title`, then `Stack`, spaced to fill                                                                                                                                                                    |
| `Brand`         | horizontal, gap 8, 32 high                                  | the mark, its SVG imported with `figma.createNodeFromSvg(svg)` and scaled to 32 x 32, named `Logo`; the design system's name, Medium 14 / 20, `color/foreground`; the style, Regular 14 / 20, `color/muted-foreground` |
| `Title`         | vertical, gap 24                                            | the library's Badge reading `Design System`; the library's name, Semi Bold 60 / 60, on two lines where it breaks; one sentence, Regular 20 / 28, `color/muted-foreground`                                              |
| `Stack`         | horizontal, gap 8                                           | one library Badge per source, a word each: the package, the style, the icon package, the font                                                                                                                          |
| the composition | from x 616, top 72, past the right edge                     | instances of the library's components as the code's demos compose them, in two or three columns 32 apart                                                                                                               |

## The component set

- Each variant is a component named `Variant=<value>, Size=<value>, State=<value>`, the properties in
  the code's order and State last, combined with `figma.combineAsVariants(components, parent)`. The
  set's name is the component's.
- The other properties are component properties: `TEXT` for a label, `BOOLEAN` for a part shown or
  hidden, `INSTANCE_SWAP` for an icon with the icon set as preferred values, `SLOT` for `children`.
  An icon the code places at either end is two pairs, `Show icon start` with `Icon start` and `Show
  icon end` with `Icon end`, as Nova's Button has them.
  Read `componentPropertyDefinitions` on the set, never on a variant.
- A matrix label reads the bare value, `sm` or `Hover`; the section heading names the axes.

## Tokens

- Each axis and `semantic` is a variable collection, the axis's values its modes. `semantic` has the modes
  `Light` and `Dark`; a value pointing into an axis is `{ type: 'VARIABLE_ALIAS', id }`.
- Variable names are grouped by slash (`color/primary`, `light/primary`), as the skill writes them.
- Axis variables get `scopes = []`. A semantic foreground gets `TEXT_FILL` and `STROKE_COLOR` with the
  shape fills; a surface adds `FRAME_FILL`; a radius gets `CORNER_RADIUS`.
- A text style binds its family with `textStyle.setBoundVariable('fontFamily', fontVariable)`.

## Light and Dark in a view

No frame the library draws sets a mode: not a view, not the Preview, not the cover. A designer
switches `semantic` between Light and Dark in the right sidebar's variable mode control, on the page
or on a frame, and everything inside follows. A frame that sets its own mode, or a second copy drawn
in Dark beside the first, shows one mode whatever the designer picks, so the switch looks broken. A
mode found set on a library frame is removed with
`frame.clearExplicitVariableModeForCollection(semanticCollection)`.

## Plan limits that shape the library

- Variable modes per collection: 10 on Professional, 20 on Organization, 40 on Enterprise.
- The Variables REST API is Enterprise only, so on Professional variables are read and written through
  the Plugin API.
- Code Connect is Organization and above, so the descriptions are the mapping.
- An axis with more values than the plan's mode limit gets modes only for the choices a
  product's `zaku.yaml` selects, and the definition of the view it affects names what is left out.

## Changing the published library

The working copy goes on a page named `zaku work` in the library file, removed once the change is
applied. The Plugin API has no publish call: a person publishes from the Assets panel's library
dialog, with the change's name as the description.

## Reading a resolved value

`variable.resolveForConsumer(node)` returns the value a node sees under the modes set on it and its
ancestors. Set the modes on a holding frame with `setExplicitVariableModeForCollection(collection,
modeId)`, place an instance of the variant inside it, read each item, and remove the frame in the same
call, so no frame with a pinned mode is left in the library. A page other than the current
one is read after `await page.loadAsync()`, and written after `await figma.setCurrentPageAsync(page)`,
once per call.

## Binding

`figma.variables.setBoundVariableForPaint(paint, 'color', variable)` returns a new paint, which is
assigned back to `fills` or `strokes`. Radius, padding and gap bind with `node.setBoundVariable(field,
variable)`.

## The snapshot

A `use_figma` reply is cut at 20 KB, so the Plugin API exports only what REST cannot read on a
Professional plan: the variables. `zaku library script` prints that export; run it with `use_figma` on
the library file and save the reply as a JSON file. `zaku library save --input <file>`, with
`FIGMA_TOKEN` set, then reads the published components over REST, which names each paint's bound
variable, and resolves every item in every mode from the export. The library has to be published for
REST to list its components.
