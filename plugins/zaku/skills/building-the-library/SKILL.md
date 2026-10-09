---
name: building-the-library
description: Use when adding or changing a library component or token, before it reaches a product file
---

# Building the Library

> **Stack assumptions: Figma, and shadcn or a DTCG token export.** The decisions here hold on any
> stack; the spellings do not, so this file names no layer's package, import or call. Before writing
> code, config or a command against one of these layers, read its reference (`references/figma.md`,
> and `references/shadcn.md` or `references/dtcg.md` for the design system `zaku.yaml` names), which
> spells each decision for that layer and names what has to survive its replacement.

## Overview

**Core principle:** the library is the code's design system drawn and documented, component by
component, in every mode a product selects, so a component is right only when every item inside it
resolves to the code's value and its documentation says, from the code, what it is and how to use it.

A set of component sources on a canvas is not a library. A designer opening it cannot tell which code a
component maps to, which property is which prop, or how a variant looks in Dark, so they guess, and the
guess reaches every product file. A component fixed at its background and left with a label colour the
code never had looks right in a screenshot of one mode. The fault is in an item nobody looked at.

Each drawing tool names, groups and pages these parts its own way: where a component's source lives,
how a variant is named, how a page divider is drawn, how a theme is switched. The decisions below are
the same in every tool; the names and the places are in the tool's reference, and a name written from
one tool's habit into another's file breaks that tool's grouping.

## When to Use

- Building a library from a design system's code, or adding a component, a variant or a token to one
- A product file reports a component that does not match its code
- A product chooses a token value the library has no mode for

## Before the first drawing

The library file is saved in the team, and `zaku.yaml` names it by its key (`figma.library`). `zaku
library save` reads the published library by that key, and the comparison with the code reads what it
saves, so a library drawn into a file with no key is one nothing can check against its code. When
`zaku.yaml` has no library key, or holds anything that is not the file's own key (a placeholder, a
note to replace it later), draw nothing: the reply says the file has to be saved in the team and asks
for its address. The tool's reference says where the key is read. Code-side work that needs no
drawing (exporting the tokens, writing the recipe page) goes on.

## The Iron Law

```
EVERY LIBRARY CHANGE RUNS IN STRICT MODE. A FINDING IS FIXED IN THE DRAWING, OR IT STOPS THAT CHANGE AND THE REPLY NAMES IT.
```

zaku's `execute` checks every node a script touched and, in strict mode, rolls the change back on a
finding. It is the only reader that looks at every item, so a change it did not pass is a change
nobody checked. Report mode keeps the whole change with every finding in it, not only the one you
judged wrong, and nothing later records that it was kept. Strict mode returns the same findings, so a
probe gains nothing from report mode and leaves nothing behind without it.

A finding that misreads the drawing (it names a node that is not what the rule says) is a defect in
the checker. Show it: the finding, the node id, and what that node really is. Then that change
waits for the checker's fix, the reply names it, and the work goes on only with what does not depend
on it.

Nothing goes into the library to make a rule stop reporting: no variable, text style or component
the code does not have. The library is published to every product file that uses it, so a variable
hidden from the pickers still ships, and the finding it silenced is still true.

## Common Rationalizations

| Excuse                                                                                                                               | Reality                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Check misreads the new text styles as unstyled text nodes (a false positive), so I'm creating them in report mode."                 | The misreading was real, and report mode kept the whole batch with it, `DS/` styles the documentation never asks for among them. Name the node and what it is, and let that change wait. |
| "Check flags raw padding, gaps and unstyled text, so the documentation gets its own hidden spacing variables and `DS/` text styles." | Documentation keeps the measures the reference writes as numbers, and the checks leave its spacing and type alone where the reference places it. A hidden variable is still published.   |
| "I'll run a probe in report mode to see what the check flags."                                                                       | Strict mode returns the same findings and rolls the probe back.                                                                                                                          |
| "The library file has no key yet; I'll write a placeholder and replace it once it is saved."                                         | Nothing compares the drawing with the code until the key is there, so every value drawn before it goes unchecked. Ask for the key first.                                                 |
| "I was told not to ask questions, so I decide."                                                                                      | The file's key is not a decision; it is a fact only the person who saved the file has. Say what is missing.                                                                              |
| "I'll draw the components now and their views later."                                                                                | A run stops partway, and what it leaves is bare sets nobody can read. Draw each entry whole, in the order below.                                                                         |

## Red Flags - STOP

- `mode: "report"` in a script that draws the library
- A variable, text style or component whose reason is a finding, or that the code does not have
- The words "false positive" with no node id and no statement of what the node is
- A placeholder, or anything but the file's key, in `zaku.yaml`'s `figma.library`
- A component or set created on the page the person happens to have open, or left at a page's top level
- A second entry started while the last one has no views

## What the library holds, in order

1. **A cover**, 1200 x 675, in two halves. On the left, a column: the brand (the design system's own
   mark, its official vector taken from the package, its repository or its site, never a letter drawn
   in a box, then the design system's name and its style's; a design system with no published mark
   shows its name alone), a badge reading `Design System`, the library's name set large, one
   sentence on what it holds, and at the foot a row of short badges naming what it was built from: the
   package, the style, the icon package, the font, a word each. On the right, the library's own
   components composed into the blocks the code's demos build (a form in a card, a calendar, a toast,
   a list of settings), bleeding off the right edge. Instances keep the cover true when a component
   changes, so the cover is drawn last, once the components it composes exist. It sets no mode of its
   own, so it shows whichever mode the page is in: a cover pinned to one mode ignores the switch a
   designer makes to see the other. A badge holds a word, not a sentence: what the library leaves out
   is said in the definition of the view it affects.
2. **The documentation components** every documentation view is built from (below). They are built
   from the library's own components, so the entries they use come first: the Badge in the header and
   the Card that holds each criterion are the library's, built and documented before any other
   entry's views. A design system with no component by that name uses the one its code shows a short
   label or a titled panel with (antd: Tag and Card).
3. **The icon set**: one component per icon the code's components and their demos import, at the code's
   default icon size, named for the icon, its description naming the code export and the size class. The
   components themselves sit in one documentation view, none of them outside it: a page header (eyebrow
   `Foundations`, title `Icons`, the badge counting the icons and naming the package, the definition
   giving the size, the stroke and the token it is bound to), then one section per icon set, each
   heading naming its set and saying which component properties swap an icon, holding that set's icons
   in a grid ten across, each over its name. The view is named for what it holds, the icons; each
   section is named for its set, because a library can carry more than one.
4. **Typography**: one component with a variant per text style. It is an entry like the components
   below, with both documentation views; its badge counts the styles.
5. **One entry per component of the code**, alphabetical, named as the code names it in words
   (`Alert Dialog` for `alert-dialog.tsx`). A component the code composes from parts (a menu and its
   items, a select and its trigger) is one entry holding every component of the family.

An entry, Typography included, holds its component and its two documentation views and nothing else.
A part with no view of its own is one nobody can read: a set of bare components on a page tells a
designer neither what each is for nor how to swap it. Work happens elsewhere,
so a half-finished copy is never mistaken for the published one.

## Tokens

A design system's tokens sit in two layers. Its **axes** are what a product chooses: each axis holds
one value per choice the design system offers, and a product picks one value on each. Its **semantic**
layer, with a Light and a Dark value for each token, is what every component uses, and each of its
values points into the axes, so a product reproduces its choices by picking one value per axis. A
choice that rewrites component classes rather than token values is not an axis: each value of it is
its own library. The design system's reference lists its axes and the `zaku.yaml` keys that name a
product's choices; a value a product adds that the design system does not generate is the `project`
axis, one value per product.

| Semantic token     | When                                                                     | Its value                                                                                                                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `color/<role>`     | every colour role of the design system                                   | the role's value on its axis, in Light and Dark                                                                                                                                                                                         |
| `color/<role>-<n>` | the code applies a role at an opacity (`bg-destructive/10`)              | the role at n%, in Light and Dark                                                                                                                                                                                                       |
| `mode/<name>`      | a part takes a different role in Dark (`bg-background dark:bg-input/30`) | each mode's own `color/` token; the description is the code that picks it; `<name>` is the component or shared role it paints, then the variant, part or state (`button-outline-bg`, `switch-thumb-on`, `control-bg`, `invalid-border`) |
| `radius/<step>`    | every step of the radius scale                                           | the radius axis's step                                                                                                                                                                                                                  |

- **A component uses only semantic tokens**, so one change of a product's choices reaches every
  component without touching one.
- **Axis tokens stay out of every picker**, and a semantic token is offered only where it paints: a
  foreground on text and strokes, a surface on fills. A designer who can pick an axis token binds a
  component to one product's choices.
- **A derived token keeps its formula**, written in its description and computed, never copied by eye:
  `<role>-<n>` is the role's colour with its alpha at n/100, in Light and in Dark, so a change of the
  role carries it.
- **Text styles are the design system's type styles**, `typography/<name>`, each with the size, weight,
  line height and tracking the code computes, its family from the typography axis, and the code that
  sets it as its description. The design system's reference lists them. A stack that opens on a
  system face the tool cannot lay out (`-apple-system`, `system-ui`) is drawn in the first family of
  the stack the tool can, and the style's description names the stack; a family outside the stack is a
  defect.

A tool that cannot hold an axis or a mode as data says so in its reference, which spells what stands in
for it. The stand-in is recorded in the definition of the view it affects, so nobody takes a
flattened library for the
whole one.

## The documentation components

Every documentation view is built from these, so every entry reads the same and a change to one
reaches all of them. Their sizes, type and spacing are the documentation's own, the same in every
library, and never the design system's: a library whose body text is 14 still documents itself at the
measures the tool's reference gives, or two libraries side by side read as two different products.
Those measures are written as the reference's numbers, never bound to a variable made for them, and
zaku's checks do not hold documentation to the spacing and text-style rules where it sits on the
pages the reference names. Only their colours and their family come from the library:

| Role            | Takes                                                                 | Draws                                                                                                                                       |
| --------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| page header     | eyebrow, component name, definition (text); whether to show the badge | on the left the eyebrow, the title and a badge; on the right the definition; behind them a glow of two radial gradients in the theme colour |
| section heading | title, description (text); whether to show the description            | a title in the typography h2 style, with the rule its border draws under it, and a lead line under that                                     |
| table head      | text                                                                  | a table's column head                                                                                                                       |
| table cell      | text; primary or muted                                                | a cell: primary for the first column, muted for the rest                                                                                    |
| list item       | text                                                                  | a bullet line                                                                                                                               |

They are built from the library's own tokens and components (the header's badge is the library's
Badge), and their descriptions say they are documentation, not product components. No documentation
component draws its own badge or card from tokens: a `DS/Badge` beside the library's Badge is a second
badge nobody maintains, and it shows a component the library has not declared. The badge says
which view a reader is in: the component view's counts what it shows (`192 variants`, `12 styles`), the
guidance view's reads `Guidance`.

Three containers recur in the views, and each is drawn the same way in every entry so a reader knows
it on sight:

| Container                                | Drawn as                                                                                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| a card holding a demo (Example, Preview) | the code's Card surface: its background, border and radius, padding 40; Example lays its demos side by side, 48 apart                             |
| a table                                  | a frame with a border and the code's table radius, its head row and each row ruled off by a border, its cells table head and table cell instances |
| an Accessibility criterion               | an instance of the library's own Card, its title the criterion and its description the rule, two to a row                                         |

## A component's two documentation views

Each view is 1440 wide, stacked top to bottom: a page header, then a body with 48 above, 96 below, 120
at each side and 64 between sections. Each section stacks a section heading over its content, 24
apart. Fixed widths and spacing keep every entry scannable in the same place.

**The component view** shows what a designer picks from: one section, Component, whose heading says
how the variants map to the code's props, and whose demo card holds the component set itself. A set
with one axis is laid out as one run of its variants, which name themselves, so it carries no labels.
A set with more than one axis is laid out as a grid, one axis along the columns and the others down
the rows, and every column and row is labelled with the bare value, `sm` and `Hover`, never
`Size=sm`: the heading already named the axes. The labels are plain text beside the set, not
components, because each is read once and never reused. The set is the matrix; no second grid of
instances repeats it.

**The guidance view** says how to use it. It takes one of two shapes, chosen by whether the component
has parts, variants and states that need more than a table to show (Button does; Typography and Badge
do not).

A component a table can show:

| Section       | Holds                                                                                                                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Example       | the code's demo of the component, rebuilt from library instances, the demo named in the description                                                                                           |
| Properties    | a table: Property, Type, Values, Maps to; one row per property, naming the prop or the part it maps to                                                                                        |
| Specs         | a table: Part, Classes, and what they resolve to in the tool (size and line height, family and weight, tracking, colour token, text style); one row per part, classes from the style's source |
| Usage         | list items: when to choose the component, and each variant or size                                                                                                                            |
| Accessibility | one Card per criterion                                                                                                                                                                        |
| Preview       | the example once more                                                                                                                                                                         |

A component that needs more, in this order:

| Section            | Holds                                                                                                                                                                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anatomy            | side by side: a demo card with the component, each part marked by a numbered marker on a leader line, and a column of Cards, one per part, titled with its number, a middle dot (U+00B7) and the part's name, the part's classes as the description |
| Variants           | a demo card with one instance per value of the variant prop, in one wrapping row                                                                                                                                                                    |
| Sizes              | the same for the size prop                                                                                                                                                                                                                          |
| Composition        | the component with each set of children the code composes into it                                                                                                                                                                                   |
| Properties         | as above                                                                                                                                                                                                                                            |
| Usage              | as above                                                                                                                                                                                                                                            |
| Behavior & content | one Card per topic, two to a row: state lifecycle, activation, loading, label rules                                                                                                                                                                 |
| Accessibility      | as above                                                                                                                                                                                                                                            |
| Preview            | the Variants and Composition rows once more                                                                                                                                                                                                         |

Anatomy's cards carry each part's classes and Variants and Sizes show the demos, so this shape has no
Example and no Specs: either would say a second time what a section above already says.

- **Accessibility** has one Card per criterion: the role, the accessible name, focus, target size,
  contrast, and any the component adds (a heading's hierarchy, a line's length).
- **Preview** is one demo card with no mode of its own: it shows whichever mode the designer switches
  the frame or page to, and its description says so. Never a Light copy beside a Dark one.
- A section is left out only when the code has nothing for it: a component with no parts of its own
  has no Specs.

**Every line in a view comes from the code.** The header's definition is the code component's own
one-line description, Properties name props, Specs name classes, Behavior and Accessibility say what
the code does. A line the code does not support is a claim nobody can check.

## The component

- **Its variant axes are the code's variant props**, named and valued as the code names them, **plus a
  State axis** where the code styles a state: Default, then the pseudo-classes and data states the
  classes name (Hover, Focus, Disabled, Invalid, Open, Checked, Loading), in that order. A designer
  drawing a disabled form needs the disabled variant the code renders, not a guess at its opacity.
- **The axes are the props that style it, every one of them.** Where the code offers a shorthand that
  sets two props at once (antd's `type`, which sets `color` and `variant`), the axes are the props it
  sets, so every combination the code renders has a variant. A shape the code offers (round, circle,
  icon-only) is a value of its axis, an icon the code places at either end is two icon properties, one
  per end, and a state the code renders (loading) is a State value. A prop left out with a line in the
  description is a variant a designer cannot pick, and draws by hand.
- **Its other properties are the code's**: a short label is text, an optional part is shown or hidden,
  an icon is swapped from the icon set, `children` is a content region, as `writing-a-design-component`
  maps them.
- **Its description is the mapping**: the code usage (`<Button variant size />`), the style and the
  product choices it was built on, which property is which prop, and which state mirrors which class.
  Its `props:` and `parts:` lines are the ones `writing-a-design-component` spells, and `zaku check`
  matches the recipe page's props and parts through them.

## Drawing an entry

An entry is drawn whole, in this order, and the next entry starts only when this one's check is
clean. A run stopped partway then leaves finished entries behind, never bare sets. The parts the
documentation components need (antd: Tag and Card) are entries too, drawn first, each in this order.
Before the first step, read the tool's reference: it names the page, the frames and their measures.

1. **The entry's page**, one per entry, named as the reference names it.
2. **The component view and the guidance view**, side by side, each a page header over its body. The
   component view's body holds the Component section and its demo card. Each view's frame is painted
   with the page surface token, so whatever sits inside is read against the surface the code draws it
   on, in whichever mode the designer switches the page to.
3. **The component set, made inside that demo card.** A set left on the bare canvas has no
   documentation, and a translucent variant (a Disabled one) reads against the editor's own
   background, near invisible. A script names the parent of everything it makes, because a node made
   with no parent lands on the page the person has open.
4. **The variants laid out apart**: one run for one axis, a grid for more, with the gaps the reference
   measures, no variant over another, and the set hugging them so none reaches past its edge, where
   the set cuts it off. A family's sets stack in the one demo card. Dark is not a second set or a copy
   of one: the page's mode switch shows it.
5. **The grid's labels**, beside the set, as the component view says.
6. **The guidance view's sections**, in the order of its table.
7. **The entry's check**: zaku's `check` over the entry's page returns no finding.

zaku's checks report a set placed on an entry page outside its view (`placement`), and a variant over
another or past its set's edge (`overlap`).

## The reply

Every reply on library work carries these lines, each REQUIRED, `none` where there is nothing:

```
Library file: <the key zaku.yaml names>
Entries: <entry> - page <page>, views <component view> and <guidance view>, sets <set names>   (one line per entry)
Check: <what zaku's check over every page returned: the count, then each finding>
Misread findings: <finding, node id, what the node really is, the change that waits>
Left out: <each part not drawn, and why>
```

## Every item of every variant

A component is checked item by item, not by its root:

1. Every paint, radius, padding, gap and font on every item, nested ones included, uses a semantic
   token or a library text style. A raw value is a defect.
2. Every variant resolves, in Light and in Dark, to the values the code computes for that variant and
   that part: background, text colour, icon colour, border, width, height, padding, gap, radius, font
   size and family. The label is checked as hard as the background, and an icon as hard as the label:
   its glyph is drawn in the colour the code renders that icon part in, so an icon beside a label
   takes the label's foreground token wherever the code's glyph follows the text colour.
3. The variants are the code's variants: a variant on one side and not the other is a defect.

`zaku library save` writes `docs/design/library.json`, every variant item by item in every mode, from
what the tool's reference names, and `zaku check` compares it with `docs/design/tokens.json` (`zaku
tokens`, reading the design system `zaku.yaml` names, as its reference spells) and
`docs/design/recipe.json`, the values the code computes when each variant renders in Light and Dark.
`zaku recipe` writes it from the product's recipe page, a route that renders every variant and marks its
parts; `writing-the-recipe-page.md` carries the page. A finding names the item by its id and field.

## Changing the published library

A change reaches every product file at its next library update. Work on a copy of the component away
from its entry, check it, then apply it to the published component, update its documentation views,
and publish once, naming the change. Where the tool cannot publish from a script, the reply asks a
person to publish and names the change for them; the reference says where the copy goes.

## Common Mistakes

| Mistake                                             | Instead                                                      |
| --------------------------------------------------- | ------------------------------------------------------------ |
| Component sources on a canvas, called a library     | The parts above, each component with its two views           |
| One variant, or no State axis                       | Every variant prop's value, by every state the classes style |
| Light only, or colours flattened into one set       | The axes, their values, and the semantic layer over them     |
| A view drawn from loose text and rectangles         | The documentation components                                 |
| Names and pages copied from one tool into another   | The tool's reference: its names, its places, its stand-ins   |
| Guidance written from what a button usually does    | Each line from the code: props, classes, states              |
| Fixing the background and calling the variant right | Every item, label and icon included                          |
| A colour typed in by eye from the stylesheet        | Converted from the stylesheet's value                        |
| A new axis for one product's colour                 | A value in `project`                                         |
