---
name: drawing-a-screen
description: Use when drawing or changing a frame in a product's design, before placing a node on it
---

# Drawing a Screen

> **Stack assumptions: Figma.** The decisions here hold on any stack; the spellings do not, so this file
> names no layer's package, import or call. Before writing code, config or a command against one of
> these layers, read its references/figma.md, which spells each decision for that layer and names what
> has to survive its replacement.

## Overview

**Core principle:** a screen is drawn as instances of components, in the place the map gives it, for
every state and target the map names, and it is done only when the outline says so.

A frame of plain rectangles and text looks finished and is not: it follows no token, matches no code
component, and drifts from its eight siblings at the first edit.

## The Iron Law

```
THE DESIGN SYSTEM IS DRAWN AS IT IS.
NO OVERRIDE ON AN INSTANCE. NO NEW SIZE, MODE, VARIANT OR LOOK-ALIKE COMPONENT FROM A DRAWING.
```

A frame that breaks it is not done, whatever else it gets right: `zaku check` fails it, the review
grades it a Blocker, and the work goes back. A guideline, a source drawing or a deadline that the
design system does not meet is reported to the person, who takes it to the design system's owner.

## When to Use

- Drawing a new screen, state or target
- Migrating a screen from an older drawing
- Changing what a frame shows

## Before the first node

1. The map entry exists and names the states and targets (`mapping-a-feature`).
2. Every block the screen holds is a component, from the library or the product file's component
   pages (`writing-a-design-component` places them). A block
   that is not yet one is made one first (`writing-a-design-component`), because every state and
   every target repeats it.
3. `zaku budget status` allows the calls the drawing needs: one write per state, plus one upload per
   picture. When it refuses partway, the reply names the states left undrawn, and the screen is not
   reported done.

## Where it goes

On the feature's page, grouped by screen and then by state in the map's order: one frame per target
in `zaku.yaml`'s order, left to right, the states of a screen stacked top to bottom, and the screens
top to bottom in the map's order, so a state reads as a row and a target as a column. The reference
says how the tool groups and spaces them:

| Target                                       | Frame size                  |
| -------------------------------------------- | --------------------------- |
| web desktop, tablet, mobile                  | 1440x900, 768x1024, 390x844 |
| iOS phone, tablet portrait, tablet landscape | 402x874, 820x1180, 1180x820 |
| Android phone, foldable, tablet              | 411x891, 673x841, 1280x800  |

The iOS sizes are the iPhone 16 Pro and the 11-inch iPad in points; the Android sizes are the phone,
foldable and tablet reference devices of Compose's `PreviewScreenSizes`, in dp, so an engineer's
preview and the frame show the same width. A frame at any other size draws a layout no device class
was measured at.

The frame is named `<title> / <state> / <target name>`, each part exactly as the map and `zaku.yaml`
spell it: `Sign in / Error / Android tablet`. The page already names the feature, so the title does
not repeat it. The parts run from the screen to the device, so the layers panel and a search list
every frame of one screen together. A target name is written out, because an abbreviation such as
`And E` is one a reader has to look up. A frame with any other name is invisible to the outline.

## What a frame holds

- **Instances, and stacked-layout frames that only place them.** A placing frame has no fill, stroke,
  effect or padding of its own.
- **An instance changes only through what the component offers**: its variant, a part shown or
  hidden, a swapped icon, its text and its content regions, spelled as the reference spells them. A
  fill, a stroke, a radius, a padding or a fixed size set on an instance, or on anything inside it, is
  an override, and an override is a defect, because the instance stops following the library and the
  code. The one fill a drawing sets inside an instance is a picture's: an image on the layer the
  component keeps for it (an avatar's image, a card's cover), which is content, not a restyle.
- **A size the layout sets.** An instance fills or hugs; equal widths come from the layout (a column
  that fills), never from fixing each instance's width.
- **A height the design system sets.** A control is as tall as the variant the design system gives
  it, on every target. The platforms ask for a hit region, not a drawn height: Apple's Human Interface
  Guidelines give a button "a hit region of at least 44x44 pt", and Material Design's accessibility
  guidance asks for a 48x48 dp touch target, which the padding around a smaller element can make up.
  So a 32-high button stays 32 high on iOS and Android, and where its hit region falls short, the reply
  names the control and the region the code has to give it. Stretching the instance is an override,
  and adding a size or a mode to the library is a change to the design system, which this drawing does
  not make.
- **Text outside an instance uses a library text style**, and its colour is a semantic token.
- **Real copy.** Placeholder copy, empty text and copy that differs between the targets of one state,
  without a reason in the map, are defects.
- **The platform's own patterns per target.** A native frame takes the platform's navigation and way
  back (`mapping-a-feature` lists them); a web frame takes the web's.
- **The platform's system bars on a native frame**: a status bar and a home indicator on iOS, a status
  bar and a navigation bar or gesture handle on Android, each an instance. Without them the content
  is laid out over space the device keeps for itself. They come from the platform's own kit enabled as
  a library in the product file (Apple's iOS UI Kit, Google's Material 3 Design Kit), never from the
  design system's library; a kit names them its own way, so `zaku.yaml`'s `systemBars` lists the
  names the kit uses.
- **On a migration, every block of the old drawing**: the logo, the copy, the controls, the photos.
  A block left out is a decision the map records with its reason, never a silent loss.

## Images

A photo, an illustration or an avatar is an image in the file, never a flat or empty frame standing in
for it. A grey panel looks like a layout choice, so a review passes it and engineering ships the screen
without the picture.

1. Take the image's bytes from its source: the URL the old drawing or the code names, or the asset
   file in the repository.
2. Bring it into the file once, as an asset the file holds; the reference spells how.
3. Every frame that shows the image reuses that one asset, so the nine targets of a state carry one
   picture and a later swap reaches all of them.

When the bytes cannot be had, the reply names every frame left without its image and why. The screen
is not reported as migrated.

## Write in few calls

One call builds a whole state, all its targets, and returns the id of every frame it created, which
keeps the reply small enough for the tool to return whole. A script
is never split only to check between steps; the outline is the check.

## Done means the outline passes

After the last write, run `zaku outline --frames <the ids written>` and `zaku check`. The reply lists
every frame drawn by name, and claims nothing the check contradicts. A check that cannot run is said
to have not run; it is never reported as passed.

## Common Rationalizations

| Excuse                                            | Reality                                                                                                                   |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| "Apple and Material want 44 pt and 48 dp"         | They want a hit region of that size, which the code gives around the drawn control; the drawn size is the design system's |
| "The library lacks this size, so I add one"       | A drawing never changes the design system; its owner does                                                                 |
| "It is only the height"                           | A height set on an instance is an override; the frame no longer matches the code                                          |
| "My local button looks the same as the library's" | A look-alike follows no token and no code; place the library's                                                            |
| "The old drawing had it this way"                 | The migration keeps the old drawing's blocks, drawn with the design system, not its pixels                                |
| "I will clean the overrides up later"             | The check fails the frame now; there is no done with an override in it                                                    |

## Red Flags - STOP

- Setting `width`, `height`, a fill, a stroke, a radius or a padding on anything inside an instance
- Creating a component whose name matches one the library publishes
- Writing to the library file while drawing a product screen
- A reply that says "matches HIG" or "matches the old drawing" about a size the design system does not give

Each means the frame is leaving the design system. Undo it, and name the gap in the reply.

## Common Mistakes

| Mistake                                                | Instead                                                     |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| Drawing one target and reporting the screen done       | Every target the map resolves, every state                  |
| A rectangle as a divider, a frame as a card            | The library's `Separator`, `Card`                           |
| Recolouring an icon inside a button                    | The button's variant, or a swapped icon                     |
| Fixing button widths to line them up                   | A layout column that fills                                  |
| Rebuilding the same header in each of nine frames      | One component, nine instances                               |
| A grey frame named after the photo it replaces         | The photo, brought in once and reused in every frame        |
| Bringing the same photo in once per frame              | Brought in once, its asset reused                           |
| Stretching a button to 44 or 48 for a native guideline | The design system's variant, and the gap named in the reply |
