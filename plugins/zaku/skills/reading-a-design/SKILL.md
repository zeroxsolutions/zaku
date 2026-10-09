---
name: reading-a-design
description: Use when a task needs what a product's design shows, before opening the drawing
---

# Reading a Design

> **Stack assumptions: Figma.** The decisions here hold on any stack; the spellings do not, so this file
> names no layer's package, import or call. Before writing code, config or a command against one of
> these layers, read its references/figma.md, which spells each decision for that layer and names what
> has to survive its replacement.

## Overview

**Core principle:** a design is read from its data first and its drawing last, one frame at a time,
because a whole drawing does not fit in a context and a slice of it is read as the whole.

A product drawn for nine targets holds hundreds of frames at a few thousand tokens each. An agent that
opens the page reads a part, guesses the rest, and answers about screens it never saw.

## When to Use

- A task asks what a screen shows, where it leads, or how a person gets back from it
- Code is about to be written from a design
- A design change is about to start and its current state is needed

## Read in this order, and stop at the first file that answers

| Order | File                                          | It answers                                                                                         |
| ----- | --------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1     | `docs/design/zaku.yaml`                       | the targets, their names, the design files, the design system and its modes                        |
| 2     | `docs/design/map/<feature>.yaml`              | the screens, their states, the targets each is drawn for, `entry`, `exits`, `back`, the components |
| 3     | `docs/design/outline/<feature>/<screen>.yaml` | each drawn frame as library instances, their properties, overrides and copy                        |
| 4     | one frame of the drawing                      | what the outline does not carry: a visual question, an image                                       |

`<feature>` is the map's file name, and the drawing's page for it is the same words: lowercased, spaces
as dashes. `zaku outline` writes the outlines from the drawing and reads nothing when they are current,
so it is run before an outline is trusted; a frame whose name parses to no screen lands in
`outline/unmapped.yaml`. `zaku schema` writes the JSON Schemas for `zaku.yaml` and the maps beside
them.

A question about navigation, states or targets is answered from the map alone. A question about which
component a frame uses, or what text it shows, is answered from the outline. The drawing is opened only
for what neither carries, and then by **one frame's id**, never by its page.

A frame's id is in the outline. Without an outline, find the frame by its name, built from the
map and `zaku.yaml` the way `drawing-a-screen` names a frame.

## What reading costs

Every read of the drawing spends context, and on a tool whose calls are metered it spends calls every
session in the team shares; the reference names the tool's limit. Reading the map and the outline costs
neither.

- One frame, one call. A read that walks a whole page counts as reading every frame on it.
- An image is evidence for a person, read once per frame, never to find something the outline names.
- `zaku budget status` says whether a call may be made. When it refuses, answer from the files and
  say which question needed the drawing.

## When the files and the drawing disagree

The drawing is the record of what was drawn; the map is the record of what was meant. A frame the map
does not name, or a map state with no frame, is a finding, reported with both names in the answer to
the task that read them. Neither file is
edited to match the other while reading.

## Common Mistakes

| Mistake                                          | Instead                                                 |
| ------------------------------------------------ | ------------------------------------------------------- |
| Opening the page to find a frame                 | Take its id from the outline, or its name from the map  |
| Screenshotting every target to compare them      | Compare their outlines; open the one frame that differs |
| Answering a navigation question from the drawing | The map's `exits` and `back` are the answer             |
