---
name: writing-a-design-component
description: Use when a block is drawn, split or named in a product's design, before it is drawn a second time
---

# Writing a Design Component

> **Stack assumptions: Figma.** The decisions here hold on any stack; the spellings do not, so this file
> names no layer's package, import or call. Before writing code, config or a command against one of
> these layers, read its references/figma.md, which spells each decision for that layer and names what
> has to survive its replacement.

## Overview

**Core principle:** a design component is the code component drawn: the same family, the same name,
the same parts and the same props, so a component found in the drawing is found in the code under the
same name.

A product drawn for nine targets repeats every block of every screen up to nine times per state. A
block left as plain frames is redrawn in each, and the copies drift at the first edit that misses one.

Each drawing tool expresses a variant, a property and a component's place its own way. The decisions
below are the same in every tool; how a variant is named, what stands in for a property the tool lacks
and where a component's source lives are in the tool's reference, and a name written from one tool's
habit into another's file breaks that tool's grouping.

## When to Use

- A block is about to appear in a second frame, of any state or any target
- Splitting a component, or naming one or its parts
- Deciding where a component lives

## A block in two frames is a component

Every block that appears in more than one frame of a product is an instance of one component: a
header, a row, a card, a form section, an empty state. Drawing it once as a component and placing it
nine times is what keeps nine targets in step. Two blocks that only look alike are not one component
until they change together, and they do when they show the same data and offer the same actions: a
row that shows another field or another action is another component, however close it looks.

## One component is one family

A family is a root and the parts only it composes, and every name in it opens with the root's name.

- **The root is `<Subject><Shape>`**: `PlaceRow`, `TripCard`, `PostHeader`. The shape is a name the
  library's own components or parts use (`Card`, `Item`, `Row`, `List`, `Header`, `Content`, `Footer`,
  `Trigger`, `Form`, `Alert`, `Sheet`, `Dialog`, `Tabs` and the rest), so a designer who knows the
  library reads what the component is. A name needing two shapes is two components.
- **A part is `<Root><Slot>`**, and its layer carries that name: `PlaceRowAction`, `TripCardMeta`. The
  slot names what belongs there, never what a caller will put in it.
- **The name is the code component's.** The component carries three mapping lines, `code: <path to its
  file>`, `props: <design property>=<code prop>, ...` and `parts: <layer>=<code part>, ...`, where the
  tool's reference says. The path is from the repository root. A component the code does not have yet
  carries `code: none`, and the reply names it as one the code has to add. Without a code-to-design
  mapping service, those lines are the mapping.

## Content arrives through a slot

A content region is the code's `children`: a title, a body, a list of rows or an action area. A text
property is kept for a short fixed label the code also takes as a string. A text property for content
is a region nobody can fill: the first screen that needs a badge or a link inside it detaches the
instance, and the detached copy follows nothing.

## Properties are the code's

| Code                                                     | In the design                                                                                                                                             |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| a cva variant (`variant`, `size`, `tone`, any other key) | a variant axis with the code's name and values, in the code's order, then a State axis where the code styles a state, as `building-the-library` orders it |
| a boolean prop                                           | a part a designer shows or hides                                                                                                                          |
| an icon prop or an icon child                            | an icon a designer swaps, offered from the library's icons                                                                                                |
| `children`, a content region                             | a content region a designer fills                                                                                                                         |

## It wraps library instances and never edits them

A product component is built from instances of the library's components. A frame inside it carries
placement only: a stacked layout, no fill, no padding of its own, no size a library variant sets. A size, a
colour or a radius the library does not draw is a library change (`building-the-library`), never an
override in a product component.

## Where it lives

The root's own body decides the kind, first match winning:

| Kind           | The root                                                                        |
| -------------- | ------------------------------------------------------------------------------- |
| `data-entry`   | holds a control whose value the product takes, not one that picks what is shown |
| `navigation`   | moving the person is its purpose, not a link a row happens to carry             |
| `feedback`     | reports a state the person cannot see: pending, failed, needs confirming        |
| `data-display` | renders data the product already holds                                          |
| `layout`       | arranges other components and adds no content                                   |
| `general`      | none of those; an atom that is clicked or read                                  |

A component one feature uses lives with that feature. When a second feature needs it, it moves to its
kind's place in the same product file, and is never copied: moving a component keeps every instance
connected, and a copy is a second component that drifts. A product component never moves into the
design system's library; the library holds the code's design system and nothing a product added.

A component is documented as the library documents its own: a component view and a guidance view, built
from the library's documentation components (`building-the-library`).

## Common Mistakes

| Mistake                                            | Instead                          |
| -------------------------------------------------- | -------------------------------- |
| The same header drawn as frames in nine targets    | One component, nine instances    |
| `title` and `description` as text properties       | A content region for each        |
| A part named `Frame 4` or `Right side`             | `<Root><Slot>`: `PlaceRowAction` |
| Copying a component to a second feature            | Move it to its kind              |
| A product card with its own fill and radius        | The library's `Card`, wrapped    |
| Names and places copied from one tool into another | The tool's reference             |
