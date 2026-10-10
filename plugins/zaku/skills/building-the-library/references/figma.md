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

- zaku's `execute` gives a script 30 s. Past that it gives the script up, removes what it made, and
  names what it could not remove (`partly-rolled-back`, `left`), so a script draws one part: a
  documentation component, a view's frame, a set, a section. A script that loads fonts, pages or
  styles does it once at its top, and awaits each async call before the next.
- Helpers (a text, a frame, a bound paint) are written at the top of each script that uses them.
  `execute` refuses code built from a string at run time (`new Function`, `eval`, a function
  constructor), which its checks cannot read, so a helper kept in `pluginData` or `clientStorage` and
  evaluated is refused.
- The plugin reads the file page by page, and Figma's API makes a style id read-only then: a text
  takes its style with `await text.setTextStyleIdAsync(style.id)`, a fill with
  `setFillStyleIdAsync`; `execute` refuses the assignment.
- Every `figma.create*()` call puts its node on `figma.currentPage`, and the current page follows the
  page the person opens while a script runs. A script that draws an entry looks the entry's page up by
  name and appends each node it makes to its parent there, before it returns.
- The views are two frames appended to the entry's page; the set is made with
  `figma.combineAsVariants(components, demoCard)`, its parent the Component section's `Preview`,
  never the page.
- A set that wraps its variants fixes its width and hugs its height (`counterAxisSizingMode =
  'AUTO'` on a horizontal set). Set the hugging axis after the last `resize()`, then read the set's
  height back: a wrapping set resized to 100 high after it was set to hug stays 100 high and cuts off
  its second row.
- Variants placed by hand sit apart, with the gaps the `Preview` row gives, and the set is resized to
  enclose them.
- The Matrix section's cells hold instances, `variant.createInstance()` appended to each `TableCell`;
  the set itself stays in the Component section.

## Pages and names

| Part                     | Page                                  | Names                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------ | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| cover                    | `Thumbnail`                           | one frame `Thumbnail`, 1200 x 675, measured below                                                                                                                                                                                                                                                                                                                             |
| documentation components | `Component for Docs`                  | `DS/Header`, `DS/Section Heading`, `DS/Table Head`, `DS/Table Cell`, `DS/List Item`, `DS/Matrix Head`, in that order, as below                                                                                                                                                                                                                                                |
| divider                  | `-`                                   | nothing                                                                                                                                                                                                                                                                                                                                                                       |
| icon set                 | U+2756, a space, `Icon`               | one 1440-wide view named `Icons`: a `DS/Header`, then a `Body` holding one section per set, named `<Icon set> / Icons` (`Lucide / Icons`), with a `Heading` titled the same and a frame `Icons (<package>)` holding the icon components `<icon set>/<name>` (`lucide/bell`) themselves, not instances, laid out as below; no icon component sits on the page outside the view |
| typography               | U+2756, a space, `Typography`         | frames `<Style> / Typography` and `<Style> / Typography / Guidance`, as a component's; the set `Typography`, variants `Variant=<name>`, inside the first                                                                                                                                                                                                                      |
| divider                  | `---`                                 | nothing                                                                                                                                                                                                                                                                                                                                                                       |
| a component              | U+2756, a space, the component's name | frames `<Style> / <Component>` and `<Style> / <Component> / Guidance` (`Nova / Button`)                                                                                                                                                                                                                                                                                       |

- Figma draws a page named only of dashes as a divider in the pages panel; pages do not nest.
- A component's sets live on its own page, inside the Component section of its component frame, so the
  assets panel groups them by page.
- The two frames sit side by side, 80 apart. The header is a `DS/Header` instance, the body a frame
  named `Body`, each section a frame named for the section opening with a `DS/Section Heading`
  instance named `Heading`. Every one of them is a vertical auto-layout (`figma.createAutoLayout`).
- A slash in a component's name groups it in the assets panel: `DS/` keeps the documentation
  components together, `lucide/` the icons.

## The documentation components

They stand in one column on `Component for Docs`, each at x 0, top to bottom in the table's order,
every one a component made with `figma.createComponent()` except `DS/Table Cell`, a set. Each
property is added with `addComponentProperty(name, type, default)` on the component (on the set for
`DS/Table Cell`) and bound to its layer through `componentPropertyReferences`; the default is the
placeholder written here, so an instance dropped in reads as one before it is filled. Each
description opens with `Doc chrome.`, then the code element it stands for.

| Component            | At y | Properties (default)                                                                                                                                                       | Layers                                                                                                                                                                                                      |
| -------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DS/Header`          | 0    | `Eyebrow` TEXT (`Components`), `Component name` TEXT (`Button`), `Show style` BOOLEAN (true), `Definition` TEXT (`Short description of the component and when to use it.`) | `Glow`; `Title block` holding the TEXT `Eyebrow`, the TEXT `Title` (bound to `Component name`) and the frame `Badges` (its `visible` bound to `Show style`); the TEXT `Description` (bound to `Definition`) |
| `DS/Section Heading` | 273  | `Title` TEXT (`Section title`), `Description` TEXT (`Section description.`), `Show description` BOOLEAN (true)                                                             | the frame `h2` holding the TEXT `Title`; the TEXT `Description`, its `characters` bound to `Description` and its `visible` to `Show description`                                                            |
| `DS/Table Head`      | 418  | `Text` TEXT (`Head`)                                                                                                                                                       | the TEXT `Text`                                                                                                                                                                                             |
| `DS/Table Cell`      | 522  | `Text` TEXT (`Cell`); the variant property `Emphasis`, `primary` then `muted`                                                                                              | two variants, `Emphasis=primary` and `Emphasis=muted`, each holding the TEXT `Text`                                                                                                                         |
| `DS/List Item`       | 812  | `Text` TEXT (`List item text.`)                                                                                                                                            | the TEXT `Bullet`, its content U+2022 (the list's own marker, drawn as the text the code's `list-disc` renders, so a writing rule against that glyph in prose does not reach it), then the TEXT `Text`      |
| `DS/Matrix Head`     | 988  | `Text` TEXT (`Prop=value`)                                                                                                                                                 | the TEXT `Text`                                                                                                                                                                                             |

- `DS/Header` is drawn first and does not wait on the library's Badge: its `Badges` frame is made
  empty. Once the Badge entry's set exists, one instance of its secondary variant, `Label` `Guidance`,
  goes into the main component's `Badges`, and every header instance already placed shows it. A view
  changes the badge's `Label` through its header instance.

## The documentation's measures

Every library draws its documentation to these measures, whatever its design system's own sizes:
the documentation is zaku's frame around the library, so its type and spacing never come from the
design system's tokens, and a reader moving between two libraries finds every header, table and card
where the last one was. Only the colours come from the library, each bound to the role named here (a
design system without one of these roles binds its nearest: its page surface, its text, its secondary
text, its divider, its subtle fill, its card surface), and only the family: the library's sans, in the
weights below. A view's frame fills with the page surface; `Body` and every section frame have no fill.

zaku's `documentation` check reads this table: it holds every component on `Component for Docs`
and every layer of a view it names to the type, layout, place, size, sizing, padding, gap, text size,
line height, weight, properties and placeholder text written here. A `*` stands for any name; a size
of `any` and an empty cell are not checked. The paint column is for the reader; the check leaves
colours alone. To change a measure, change zaku's table, which prints this one.

<!-- documentation-measures: generated from zaku, edit the table there -->

| Part                                                        | Type          | Layout                                                           | Place, size, sizing                       | Text, properties, paint                                                                                                                                                                                                           |
| ----------------------------------------------------------- | ------------- | ---------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DS/Header`                                                 | COMPONENT     | horizontal, padding 48 40 40 40, gap 48, align space_between max | at 0, 0; 1440 x any; sizing fixed / hug   | `Eyebrow` TEXT (`Components`), `Component name` TEXT (`Button`), `Show style` BOOLEAN (`true`), `Definition` TEXT (`Short description of the component and when to use it.`); fill color/background; bottom stroke 1 color/border |
| `DS/Header` / `Glow`                                        | FRAME         |                                                                  | at 0, 0; 1440 x 193                       | no fill; absolute, not clipping; two radial ellipses, named and placed under the table                                                                                                                                            |
| `DS/Header` / `Title block`                                 | FRAME         | vertical, gap 12                                                 | sizing hug / hug                          |                                                                                                                                                                                                                                   |
| `DS/Header` / `Title block` / `Eyebrow`                     | TEXT          |                                                                  |                                           | Regular 14 / 20; reads `Components`; color/muted-foreground                                                                                                                                                                       |
| `DS/Header` / `Title block` / `Title`                       | TEXT          |                                                                  |                                           | ExtraBold 36 / 40; reads `Button`; color/foreground; tracking -2.5%                                                                                                                                                               |
| `DS/Header` / `Title block` / `Badges`                      | FRAME         | horizontal, gap 8                                                | sizing hug / hug                          | no fill; holds one instance of the library's Badge, secondary, once it exists                                                                                                                                                     |
| `DS/Header` / `Description`                                 | TEXT          |                                                                  | 480 x any                                 | Regular 16 / 28; reads `Short description of the component and when to use it.`; color/muted-foreground                                                                                                                           |
| `DS/Section Heading`                                        | COMPONENT     | vertical, gap 8                                                  | at 0, 273; 1200 x 81; sizing fixed / hug  | `Title` TEXT (`Section title`), `Description` TEXT (`Section description.`), `Show description` BOOLEAN (`true`); no fill                                                                                                         |
| `DS/Section Heading` / `h2`                                 | FRAME         | vertical, padding 0 0 8 0, gap 0                                 | 1200 x 45; sizing fill / hug              | bottom stroke 1 color/border, counted in the layout                                                                                                                                                                               |
| `DS/Section Heading` / `h2` / `Title`                       | TEXT          |                                                                  |                                           | SemiBold 30 / 36; reads `Section title`; color/foreground; tracking -2.5%                                                                                                                                                         |
| `DS/Section Heading` / `Description`                        | TEXT          |                                                                  | 1200 x any; sizing fill / any             | Regular 16 / 28; reads `Section description.`; color/muted-foreground; visible bound to Show description                                                                                                                          |
| `DS/Table Head`                                             | COMPONENT     | vertical, padding 0 8 0 8, gap 0, align center min               | at 0, 418; 200 x 40; sizing fixed / fixed | `Text` TEXT (`Head`); no fill                                                                                                                                                                                                     |
| `DS/Table Head` / `Text`                                    | TEXT          |                                                                  | sizing fill / any                         | Medium 14 / 20; reads `Head`; color/foreground                                                                                                                                                                                    |
| `DS/Table Cell`                                             | COMPONENT_SET | horizontal, wrap, padding 24 24 24 24, gap 24, row gap 24        | at 0, 522; 500 x 84; sizing fixed / hug   | `Text` TEXT (`Cell`), `Emphasis` VARIANT (`primary`); radius 5; the dashed border Figma gives a set                                                                                                                               |
| `DS/Table Cell` / `Emphasis=primary`                        | COMPONENT     | vertical, padding 8 8 8 8, gap 0                                 | at 24, 24; 200 x 36; sizing fixed / hug   | no fill                                                                                                                                                                                                                           |
| `DS/Table Cell` / `Emphasis=primary` / `Text`               | TEXT          |                                                                  | sizing fill / any                         | Medium 14 / 20; reads `Cell`; color/foreground                                                                                                                                                                                    |
| `DS/Table Cell` / `Emphasis=muted`                          | COMPONENT     | vertical, padding 8 8 8 8, gap 0                                 | at 248, 24; 200 x 36; sizing fixed / hug  | no fill                                                                                                                                                                                                                           |
| `DS/Table Cell` / `Emphasis=muted` / `Text`                 | TEXT          |                                                                  | sizing fill / any                         | Regular 14 / 20; reads `Cell`; color/muted-foreground                                                                                                                                                                             |
| `DS/List Item`                                              | COMPONENT     | horizontal, gap 10                                               | at 0, 812; 1176 x 28; sizing fixed / hug  | `Text` TEXT (`List item text.`); no fill                                                                                                                                                                                          |
| `DS/List Item` / `Bullet`                                   | TEXT          |                                                                  | sizing hug / any                          | Regular 16 / 28; reads U+2022; color/foreground                                                                                                                                                                                   |
| `DS/List Item` / `Text`                                     | TEXT          |                                                                  | sizing fill / any                         | Regular 16 / 28; reads `List item text.`; color/foreground                                                                                                                                                                        |
| `DS/Matrix Head`                                            | COMPONENT     | vertical, padding 0 8 0 8, gap 0, align center center            | at 0, 988; 120 x 40; sizing fixed / fixed | `Text` TEXT (`Prop=value`); no fill                                                                                                                                                                                               |
| `DS/Matrix Head` / `Text`                                   | TEXT          |                                                                  | sizing hug / any                          | Medium 12 / 16; reads `Prop=value`; color/muted-foreground                                                                                                                                                                        |
| view *                                                      | FRAME         | vertical, gap 0                                                  | 1440 x any                                | fill color/background                                                                                                                                                                                                             |
| view * / *                                                  | INSTANCE      |                                                                  | 1440 x any                                | instance of `DS/Header`                                                                                                                                                                                                           |
| view * / `Body`                                             | FRAME         | vertical, padding 48 120 96 120, gap 64                          | 1440 x any                                | no fill                                                                                                                                                                                                                           |
| view * / `Body` / *                                         | FRAME         | vertical, gap 24                                                 | 1200 x any                                | no fill                                                                                                                                                                                                                           |
| view * / `Body` / * / `Heading`                             | INSTANCE      |                                                                  | 1200 x any                                | instance of `DS/Section Heading`                                                                                                                                                                                                  |
| view * / `Body` / `Component` / `Preview`                   | FRAME         | horizontal, gap 24, or vertical, gap 40                          | 1200 x any                                | fill color/background, radius 14, no stroke; vertical for a set of text styles                                                                                                                                                    |
| view * / `Body` / `Matrix` / `Matrix`                       | FRAME         | vertical, gap 0                                                  | 1200 x any                                | stroke 1 color/border, radius 8                                                                                                                                                                                                   |
| view * / `Body` / `Matrix` / `Matrix` / `TableHeader`       | FRAME         | horizontal, gap 0                                                | any x 40                                  |                                                                                                                                                                                                                                   |
| view * / `Body` / `Example` / `Preview`                     | FRAME         | horizontal, wrap, padding 40 40 40 40, gap 48, row gap 24        | 1200 x any                                | fill color/background, stroke 1 color/border, radius 14                                                                                                                                                                           |
| view * / `Body` / `Variants` / `Preview`                    | FRAME         | horizontal, padding 40 40 40 40, gap 24, align center center     | 1200 x any                                | fill color/background, stroke 1 color/border, radius 14                                                                                                                                                                           |
| view * / `Body` / `Variants` / `Preview` / `Variants`       | FRAME         | horizontal, wrap, gap 12, row gap 12, align min center           | sizing hug / hug                          | centred in the preview, hugging its row of instances                                                                                                                                                                              |
| view * / `Body` / `Sizes` / `Preview`                       | FRAME         | horizontal, padding 40 40 40 40, gap 24, align center center     | 1200 x any                                | fill color/background, stroke 1 color/border, radius 14                                                                                                                                                                           |
| view * / `Body` / `Sizes` / `Preview` / `Sizes`             | FRAME         | horizontal, wrap, gap 12, row gap 12, align min center           | sizing hug / hug                          | centred in the preview, hugging its row of instances                                                                                                                                                                              |
| view * / `Body` / `Composition` / `Preview`                 | FRAME         | horizontal, padding 40 40 40 40, gap 24, align center center     | 1200 x any                                | fill color/background, stroke 1 color/border, radius 14                                                                                                                                                                           |
| view * / `Body` / `Composition` / `Preview` / `Composition` | FRAME         | horizontal, wrap, gap 12, row gap 12, align min center           | sizing hug / hug                          | centred in the preview, hugging its row of instances                                                                                                                                                                              |
| view * / `Body` / `Anatomy` / `Anatomy layout`              | FRAME         | horizontal, gap 16                                               | 1200 x any                                |                                                                                                                                                                                                                                   |
| view * / `Body` / `Anatomy` / `Anatomy layout` / `Preview`  | FRAME         | horizontal, padding 24 24 24 24, gap 24, align center center     | 744 x any; sizing fill / fill             | fill color/background, stroke 1 color/border, radius 14                                                                                                                                                                           |
| view * / `Body` / `Anatomy` / `Anatomy layout` / `Cards`    | FRAME         | grid, gap 16, row gap 16                                         | 440 x any; sizing fixed / hug             | one column, one Card per part                                                                                                                                                                                                     |
| view * / `Body` / * / `Table`                               | FRAME         | vertical, gap 0                                                  | 1200 x any                                | stroke 1 color/border, radius 8                                                                                                                                                                                                   |
| view * / `Body` / * / `Table` / `TableHeader`               | FRAME         | horizontal, gap 0                                                | any x 40                                  | bottom stroke 1 color/border                                                                                                                                                                                                      |
| view * / `Body` / * / `Table` / `TableRow`                  | FRAME         | horizontal, gap 0                                                |                                           | bottom stroke 1 color/border, none on the last                                                                                                                                                                                    |
| view * / `Body` / * / `List`                                | FRAME         | vertical, padding 0 0 0 24, gap 8                                | 1200 x any                                |                                                                                                                                                                                                                                   |
| view * / `Body` / * / `List` / `li`                         | INSTANCE      |                                                                  | 1176 x any                                | instance of `DS/List Item`                                                                                                                                                                                                        |
| view * / `Body` / * / `Cards`                               | FRAME         | grid, gap 16, row gap 16                                         | 1200 x any                                |                                                                                                                                                                                                                                   |
| view * / `Body` / * / `Cards` / `Card`                      | INSTANCE      |                                                                  | 592 x any                                 | the library's Card                                                                                                                                                                                                                |
| view * / `Body` / `Preview` / `Theme Preview`               | FRAME         | horizontal, gap 16                                               | 1200 x any                                |                                                                                                                                                                                                                                   |
| view * / `Body` / `Preview` / `Theme Preview` / `Preview`   | FRAME         | vertical, padding 40 40 40 40, gap 20                            |                                           | fill color/background, stroke 1 color/border, radius 14; no mode of its own                                                                                                                                                       |

<!-- /documentation-measures -->

- No text in the documentation takes a library text style, even one at the same size and weight: the
  style brings its own line height, and the check reports the drift.
- `Glow`'s two ellipses are each named `Glow`, a middle dot (U+00B7) between spaces, then its role: the
  `primary` one 900 x 420 at 820, -170, opacity 0.28; the `sidebar-primary` one 560 x 300 at 1120, 10,
  opacity 0.22. Each has a `GRADIENT_RADIAL` fill, its first stop bound to the role its name gives
  (`color/primary`; then the sidebar's primary, or the nearest accent where the design system has
  none), its last stop the same colour at alpha 0.
- The badge in `Badges` is one instance of the library's Badge, secondary variant, named `Badge`, a
  middle dot between spaces, `secondary`: padding 2 8, 20 high. Its text is an override of its `Label`.
- `Eyebrow` reads `Foundations` in the icon set's view and `Components` in every entry, Typography
  included.
- A table's `TableHeader` and `TableRow` hold its columns: the last fills, the others are fixed widths
  that add up to 1198, inside the table's 1 px border. A row hugs its cells, 37 high for one line and 57
  for two. `DS/Table Head` and `DS/Table Cell` instances are resized to their column.
- A `Cards` grid holds the library's Card, its default size with no footer, holding its title and
  description: padding 16 0, gap 16, fill `color/card`, radius 14.
- The Component section's `Preview` holds the set itself, its variants placed by hand 24 to 48 apart
  with 24 to 32 around them, the dashed border Figma gives a set, radius 5; no labels. A set too large
  for one row stands in a labelled grid instead, as "The component set" below gives.
- The Matrix section's `TableHeader` holds a `DS/Table Head` reading the row axis's name (`Size`), 140
  wide, then one `DS/Matrix Head` per column value reading `Prop=value` (`State=Hover`), each 120 wide,
  wider where the column's widest instance needs more. Each `TableRow` holds a `DS/Table Cell` primary
  reading the row's bare value (`sm`), 140 wide, then one frame `TableCell` per column, vertical,
  padding 16 8, centred both ways, its width fixed to the head's, holding one instance of that variant.
  The other axes stand at their defaults. A set whose instance is wider than 600 is listed instead: two
  heads, `Variant` 280 wide and `Preview` filling, and per row a `DS/Table Cell` primary reading the
  variant's whole name, then a `TableCell` holding its instance.
- The Anatomy `Preview` is centred both ways and holds a frame `Anatomy` 560 x 280 with no auto
  layout: the component, `Marker <n>` frames 24 x 24 filled `color/primary`, fully round, and `Leader`
  rectangles 1 px wide filled `color/border`.
- The Theme Preview section's description says the theme follows the variable mode switched on the
  frame.
- `Icons (<package>)`, the icon set's frame, has no auto layout and is 1200 wide: ten cells 120 wide to
  a row, rows 88 apart; each icon at 52, 20 in its cell, its name under it from y 48, Regular 12 / 16,
  `color/muted-foreground`, centred on the icon, the TEXT named for the icon; the icon's strokes bound
  to `color/foreground`.

## The cover

The frame `Thumbnail` fills with `color/background` and sets no mode. It clips: the glow runs past
every edge and the composition past the right one, and nothing else leaves the frame. The
`documentation` check reports a layer that reaches past its top, left or bottom edge, or past its
right edge from left of x 616.

| Part            | Place and size                                              | Content                                                                                                                                                                                                                                                                                |
| --------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Glow`          | a frame 1200 x 675 at 0, 0, no fill, behind everything      | three ellipses named as the header's: `primary` 1000 x 760 at 520, -260, opacity 0.70; `sidebar-primary` 560 x 460 at 820, -120, opacity 0.35; `primary`, a middle dot, `bottom` 760 x 520 at -280, 420, opacity 0.45; each fill drawn as the header's                                 |
| `Intro`         | vertical, at 72, 72, 464 wide, its foot 72 above the bottom | `Brand`, then `Title`, then `Stack`, spaced to fill                                                                                                                                                                                                                                    |
| `Brand`         | horizontal, gap 8, items centred, 32 high                   | the mark, its SVG imported with `figma.createNodeFromSvg(svg)` and scaled into a 32 x 32 frame named `Logo`, radius `radius/lg`; the design system's name, Medium 14 / 20, `color/foreground`; the style, Regular 14 / 20, `color/muted-foreground`                                    |
| `Title`         | vertical, gap 24                                            | the library's Badge, its outline variant, reading `Design System`; the library's name, Semi Bold 60 / 60, tracking -2.5%, `color/foreground`, on two lines where it breaks; one sentence, Regular 20 / 28, `color/muted-foreground`, in the library's lead text style where it has one |
| `Stack`         | horizontal, gap 8, its foot 72 above the bottom             | one library Badge per source, its secondary variant, a word each: the package, the style, the icon package, the font                                                                                                                                                                   |
| the composition | from x 616, top 72, past the right edge                     | instances of the library's components as the code's demos compose them, in two or three columns 32 apart                                                                                                                                                                               |

## The component set

- Each variant is a component named `Variant=<value>, Size=<value>, State=<value>`, the properties in
  the code's order and State last, combined with `figma.combineAsVariants(components, parent)`. The
  set's name is the component's.
- The other properties are component properties: `TEXT` for a label, `BOOLEAN` for a part shown or
  hidden, `INSTANCE_SWAP` for an icon with the icon set as preferred values, `SLOT` for `children`.
  An icon the code places at either end is two pairs, `Show icon start` with `Icon start` and `Show
  icon end` with `Icon end`.
- An icon in a variant takes the label's colour as Nova's Button does: the icon component keeps its
  own `color/foreground`, and the variant overrides the paint of the icon's glyph layers, `strokes`
  for a stroked set such as Lucide and `fills` for a filled one, bound to the variable the label's
  fill is bound to (`color/primary-foreground` on the default Button). The override sits in the
  variant, so every instance of the variant carries it; `zaku check` allows that paint override
  inside a component and still reports it in a product frame, and reports it raw.
  Read `componentPropertyDefinitions` on the set, never on a variant.
- A set too large for one row of the Component section's `Preview` is laid out as Nova lays out
  Button's 192 variants, inside a frame `Matrix` that the `Preview` holds: no auto layout, 1200 wide,
  fixed, the set at 176, 40 in it.
  - The columns are the axis with the most values whose widest variants still fit the 1024 to the
    right of the labels (Nova: `Size`, eight columns). Where no single axis fills the width and two
    fit, the columns are both, the code's later axis inner.
  - The rows nest the other axes in the code's order, State last: one group per value of the outer
    axis (Nova: six `Variant` groups), one row per value of the inner one (four `State` rows each). A
    third axis left over is a level of groups between them. Rows sit 12 apart, each as high as its
    tallest variant, with no extra space between groups, and each variant is centred in its cell.
  - Each value is labelled once, in `Matrix` beside the set, never inside a variant: a column's bare
    value (`sm`) above its column at y 12, centred on it, Medium 12 / 16; a group's value (`outline`)
    at x 0 on the group's first row, Medium 14 / 20; a row's value (`Hover`) on its row, its right
    edge 12 before the set, Regular 12 / 16.
  - Every variant the code styles is drawn, however many the axes multiply to. The grid, not the
    count, keeps a large set readable, and a variant left out is a value a product cannot place.
- In the Matrix section, a row's label reads the bare value (`sm`), under a head naming the row axis
  (`Size`); a column's head reads `Prop=value` (`State=Hover`). The section is titled `Matrix`, its
  description `Every variant, labelled by property.`

## Tokens

- Each axis and `semantic` is a variable collection, the axis's values its modes. `semantic` has the modes
  `Light` and `Dark`; a value pointing into an axis is `{ type: 'VARIABLE_ALIAS', id }`.
- Variable names are grouped by slash (`color/primary`, `light/primary`), as the skill writes them.
- Axis variables get `scopes = []`. A semantic foreground gets `TEXT_FILL` and `STROKE_COLOR` with the
  shape fills; a surface adds `FRAME_FILL`; a radius gets `CORNER_RADIUS`; a `spacing/` token gets
  `GAP`, the scope Figma's auto layout gap and padding fields offer.
- Figma refuses `.`, `{`, `}` and `$` in a variable's name, so a step's `.` is written `_`:
  `spacing/2_5`.
- A `spacing/<step>` token is a `FLOAT` in `semantic` with the same value in `Light` and `Dark`, bound with
  `node.setBoundVariable('paddingLeft', variable)` and the same for each padding side and `itemSpacing`.
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
REST to list its components. Without `figma.library` in `zaku.yaml` it exits 3, naming the field, and
reads nothing.
