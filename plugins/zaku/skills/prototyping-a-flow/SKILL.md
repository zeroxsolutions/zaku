---
name: prototyping-a-flow
description: Use when connecting screens or adding a transition or an animation, before a prototype is shared
---

# Prototyping a Flow

> **Stack assumptions: Figma.** The decisions here hold on any stack; the spellings do not, so this file
> names no layer's package, import or call. Before writing code, config or a command against one of
> these layers, read its references/figma.md, which spells each decision for that layer and names what
> has to survive its replacement.

## Overview

**Core principle:** a prototype is the map made clickable, and every motion in it names a pattern and
tokens the code can implement, so what a person tries in the prototype is what ships.

A connection drawn by hand drifts from the map, and a transition picked by eye is a duration and a curve
no engineer can find in the design system.

## When to Use

- Connecting screens, or adding a way in, out or back
- Adding a transition between screens, or an animation inside a component
- Sharing a prototype for review or testing

## Connections follow the map

1. **Every root screen starts a flow on every target it is drawn for**, on its first state's frame,
   named `<title> / <target name>`, so a reviewer opens the flow for the device they test on.
2. **Every `exits` edge in the map is a connection** from the control its `via` names, on every target
   the screen is drawn for. A connection the map does not have is a map change first
   (`mapping-a-feature`).
3. **Every `back` is the Back action**, on the control the map names for that platform.
4. **A sheet, a dialog or a menu opens over the screen it came from**, and closes on its close control
   and outside it. Where the tool cannot set the outside close, the reply names the overlay for a person
   to set it.
5. **Shared navigation carries its interactions on its component** (a tab bar, an app bar), so every
   instance inherits them and none is wired by hand.

## A component's own states

A pressed, hover, focus, loading or selected state is a variant of the component, and the change between
variants is an animated interaction on the component where the tool has one: hover on the pointer
entering, pressed while pressed, each back on release, with the `standard` easing at `short4`. A
screen never fakes a component state with a second frame.

## A transition names its pattern and its tokens

| Moving between                                                                                            | Pattern                                                                                                               |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| a list item and its detail, a card and the screen it opens: the tapped element grows into the next screen | container transform                                                                                                   |
| siblings in a sequence: steps, tabs, pages of one flow                                                    | shared axis, with its axis (x for steps, y for a stack, z for a parent and a child with no element that carries over) |
| unrelated screens, such as tab destinations                                                               | fade through                                                                                                          |
| an element that enters or leaves in place                                                                 | fade                                                                                                                  |
| a native push or pop                                                                                      | the platform's system transition, whose curve and duration no token names; the Motion note says `system push`         |

The duration is one of Material 3's duration tokens and the easing a named easing token, below.
Material 3 sets the easing by what the motion is: **emphasized** for a screen or an element entering,
leaving or crossing the screen, **standard** for a utility change inside a component (a hover, a
switch's thumb, a check). Its pairs, from Material 3's "Easing and duration" tokens and specs:

| The motion                                      | Easing                  | Duration  |
| ----------------------------------------------- | ----------------------- | --------- |
| a screen or an element entering                 | `emphasized-decelerate` | `medium4` |
| a screen or an element leaving                  | `emphasized-accelerate` | `short4`  |
| a utility change that begins and ends on screen | `standard`              | `medium2` |
| a component's state change                      | `standard`              | `short4`  |

A transition between two screens enters one and leaves the other. Where the tool gives one transition
one curve, it takes the entering pair, because the person watches the screen arriving, and the Motion
note records the leaving pair.

| Token   | ms  |     | Token       | ms   |
| ------- | --- | --- | ----------- | ---- |
| short1  | 50  |     | long1       | 450  |
| short2  | 100 |     | long2       | 500  |
| short3  | 150 |     | long3       | 550  |
| short4  | 200 |     | long4       | 600  |
| medium1 | 250 |     | extra-long1 | 700  |
| medium2 | 300 |     | extra-long2 | 800  |
| medium3 | 350 |     | extra-long3 | 900  |
| medium4 | 400 |     | extra-long4 | 1000 |

Easing, as Material 3 publishes it:

| Token                   | Curve                                                                                                | For                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `emphasized`            | a two-segment path, `M 0,0 C 0.05, 0, 0.133333, 0.06, 0.166666, 0.4 C 0.208333, 0.82, 0.25, 1, 1, 1` | an expressive move that starts and ends on screen |
| `emphasized-decelerate` | cubic-bezier(0.05, 0.7, 0.1, 1)                                                                      | an expressive element entering                    |
| `emphasized-accelerate` | cubic-bezier(0.3, 0, 0.8, 0.15)                                                                      | an expressive element leaving                     |
| `standard`              | cubic-bezier(0.2, 0, 0, 1)                                                                           | a utility move on screen                          |
| `standard-decelerate`   | cubic-bezier(0, 0, 0, 1)                                                                             | a utility element entering                        |
| `standard-accelerate`   | cubic-bezier(0.3, 0, 1, 1)                                                                           | a utility element leaving                         |

`emphasized` is not a cubic curve, so a tool that takes a cubic-bezier can only approximate it; the
reference says what its tool draws instead.

## What the tool cannot draw is written

A real container transform, a gesture that follows the finger's velocity, predictive back and a shared
element are written in a Motion note beside the screen, one line per transition:

```
<from frame> -> <to frame>: <pattern>, <easing> <duration>; leaving <easing> <duration>; moves <what>; reduced: <fade or instant>
```

## Reduced motion, and motion carries nothing alone

Every transition that moves, scales or blurs has a reduced-motion version, a fade or an instant change,
honouring the platform setting (WCAG 2.2 SC 2.3.3; Apple "Reduce Motion"; Android "Remove animations").
No information is carried by motion alone, and anything that moves by itself for more than five seconds
can be paused (WCAG 2.2 SC 2.2.2).

## Common Mistakes

| Mistake                                              | Instead                                            |
| ---------------------------------------------------- | -------------------------------------------------- |
| Wiring a tab bar in every frame                      | Its interactions on its component                  |
| "Dissolve, 300 ms, ease out" picked by eye           | A named pattern, a duration token, an easing token |
| A loading screen drawn as its own frame for a button | The button's loading variant                       |
| A slide-in with no reduced-motion version            | A fade or instant change beside it                 |
