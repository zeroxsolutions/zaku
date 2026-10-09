---
name: reviewing-a-design
description: Use when a design change is about to be reported done, or when a reviewer asks for evidence
---

# Reviewing a Design

> **Stack assumptions: Figma.** The decisions here hold on any stack; the spellings do not, so this file
> names no layer's package, import or call. Before writing code, config or a command against one of
> these layers, read its references/figma.md, which spells each decision for that layer and names what
> has to survive its replacement.

## Overview

**Core principle:** a design change is right when every criterion passes with its evidence shown, and
the agent that drew it is not the one who says so.

An agent that drew a screen praises it, and a screenshot it took of its own work says nothing about
the item inside the component it never opened.

## When to Use

- A design change is about to be reported done, handed to engineering, or put in a pull request
- A person asks whether a screen is ready
- Reviewing another agent's or person's drawing

## Who reviews

The review runs as a fresh agent that holds the contract (the map entries the change was meant to
satisfy), the outline, the checker's output and the images, and none of the drawing agent's reasoning.
The drawing agent starts it as a subagent or a new session whose prompt is this skill's name and four
paths: the map file's diff, `docs/design/outline/<feature>/<screen>.yaml`, the saved `zaku check`
output and the comparison images, and nothing of what the drawing agent concluded.
The drawing agent wrote the contract before it drew, and the review checks the drawing against that
contract, not against what the drawing turned out to be.

## The criteria

Run `zaku check` first. Every criterion below is one of its checks, and each passes or names the
nodes that fail it. It exits 0 when every check passed, 1 when one found something, and 2 when a check
could not run; a check printed `NOT RUN` is decided by the review from the images, like the list after
the table.

| Criterion            | Fails when                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| coverage             | a state or a target in the map has no frame, or a frame names nothing in the map                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| way back             | a screen that is not a root has no way back on a platform it targets                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| library              | a node outside a library or product component, other than a frame that only places                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| component            | a block repeated across frames is not an instance of one component                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| overrides            | an instance, or anything inside it, has a fill, stroke, effect, radius, padding, font or fixed size changed                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| target size          | a control under the size its platform asks for, 44x44 pt on iOS and 28x28 pt on macOS (Apple HIG Accessibility, default control size), 48x48 dp on Android (Material accessibility), 40x40 epx on Windows (Microsoft Learn, "Guidelines for touch targets"), 24x24 px on the web (WCAG 2.2 SC 2.5.8) and on GNOME and KDE (the same criterion, which WCAG2ICT applies to non-web software; neither guideline states a size), that is not a library control at its own variant's height; one at that height passes, and the drawing's reply names the hit region the code gives it |
| copy                 | empty or placeholder text, copy that differs between targets with no reason in the map, or authored text (outside an instance, or a text override) holding a character outside ASCII and `zaku.yaml`'s `copy` locales and currencies, or a phrase of the tell list                                                                                                                                                                                                                                                                                                                |
| naming and placement | a default layer name, a frame outside the place `drawing-a-screen` gives it, or a frame name or size other than `drawing-a-screen` gives                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| images               | a frame where the source shows a picture, or a layer named for one, holds a flat or empty frame instead of the image                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| system bars          | a native frame without its platform's bars: the status bar and home indicator or navigation bar of a phone or tablet, or the bar a desktop window's controls sit in                                                                                                                                                                                                                                                                                                                                                                                                               |
| prototype            | a root with no starting point, an exit with no connection, a screen with no Back                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

What the checker cannot decide, the review decides from images and says what it looked at:

- One comparison image per screen, states in rows and targets in columns: the screen's own group on
  its page, which `drawing-a-screen` lays out that way, rendered whole in one call. A missing cell,
  clipped text, or a state that drew a different component from its siblings shows there.
- Whether each target behaves as its platform does, by the map's `back` and the patterns in
  `mapping-a-feature`.

The images are evidence for the reviewer and for a person, never the gate: an agent's count of its own
screenshots says nothing about whether the drawing is right.

## The report

One table per screen, every criterion a row, and every row its evidence:

```md
| Criterion | Result | Evidence                                                             |
| --------- | ------ | -------------------------------------------------------------------- |
| coverage  | fail   | `Sign in / Error / iPad landscape` has no frame                      |
| overrides | fail   | 120:44 fills, inside `Button` on `Sign in / Default / Android phone` |
| copy      | pass   | `zaku check` copy: 0 findings                                        |
```

Every finding is graded by its criterion, never by how small it looks:

| Grade   | Criteria                                                                                                                                                                                                                                            |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Blocker | overrides; library (a raw node, or a local component that copies one the library publishes); a change to the library made by the drawing (the library file's version has moved past the snapshot's while the change made no library edit); coverage |
| High    | component; images; system bars; way back; target size; prototype                                                                                                                                                                                    |
| Medium  | copy; naming and placement                                                                                                                                                                                                                          |
| Nit     | what a person could reasonably choose otherwise, with the reason                                                                                                                                                                                    |

A Blocker or a High sends the work back, and the drawing is not reported done until a new review
passes it. The grade does not drop because the finding is one node, or because the drawing agent gave a
reason for it. The report never says "looks good"; a row with no evidence is a row not checked, and says
`not run`.

The report ends with what no criterion covers yet, for a person to decide: whether the flow suits the
person using it, and taste.

## Common Mistakes

| Mistake                                   | Instead                                                      |
| ----------------------------------------- | ------------------------------------------------------------ |
| Reviewing your own drawing and passing it | A fresh reviewer with the contract                           |
| "All frames look consistent"              | A row per criterion, each with layer ids                     |
| A screenshot per frame as the review      | The check first, one comparison image per screen as evidence |
| Calling a screen ready with a High open   | Send it back                                                 |
