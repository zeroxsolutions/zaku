---
name: mapping-a-feature
description: Use when adding or changing a screen, a state or a way between screens, before drawing it
---

# Mapping a Feature

## Overview

**Core principle:** a screen is named in the map, with every state, target and way in, out and back,
before a single frame of it is drawn, because what the map does not name nobody checks.

The map is `docs/design/map/<feature>.yaml`, validated against `map.schema.json`, which the plugin
ships in its `schemas/` directory and `zaku schema` writes beside the maps for an editor. The drawing
follows it; it never leads it.

## When to Use

- A screen, a state or a target is about to be added, removed or renamed
- A screen is about to gain a way in, a way out or a way back
- A web screen is about to get its native versions, or a native screen its web ones

## The entry, in this order

```yaml
<screen-id>:
  title: <Title as frames are named>
  root: true # only for a screen a person starts on: a tab, a sign-in, a not-found
  states: [Default, Loading, Empty, Error]
  targets: all # or the target ids it is drawn for
  omits: { <target id>: <why> } # every target it leaves out, with the reason
  entry:
    - { from: <screen-id or feature/screen-id>, via: <the control> }
    - { url: /<path>/, { <param> } }
  exits:
    - { to: <screen-id or feature/screen-id>, via: <the control> }
    - { to: <this screen-id>, via: <the control> } # <the states that show it>
  back: # one line per family the screen's targets have
    <family>: <the control and the screen it returns to>
  components: [<library or product component>]
```

1. **`states` opens with `Default`**, then the data states every screen that reads data has: Loading,
   Empty, Error. A screen reads data when it shows what the product fetches (a list, a detail, a
   profile); a form that only sends has Default and Error, and its sending is the submit control's
   loading variant, not a state. A state the feature adds (Offline, Permission denied, Done) follows
   Error, in the order a person meets it. A state is spelled as its frame names it, capitals included,
   because the frame name is matched to the map letter for letter. A state is named once for every
   target; how it is drawn per target (a sheet on a phone, a dialog on a desktop) is a drawing
   decision, not a second state.
2. **`targets` is `all` unless a target is left out**, and every target left out is in `omits` with
   its reason. A target missing without a reason is a gap, not a decision. A target is the `id` of one
   of `zaku.yaml`'s `targets`; its `name` is what a frame name carries and its `family` (`web`, `ios`,
   `android`, `macos`, `windows`, `gnome`, `kde`) is the key under `back`.
3. **Every screen that is not a root has an `entry`**, and every `exits.to` names a screen some map
   has. A `via` names the control in the words the screen shows on it (its label, or its accessible
   name when it shows none), and the drawing names that control's layer the same, so the connection
   and the review find it.
4. **Every screen that is not a root has a `back` for each platform family it targets.** It names the
   control and the screen it returns to.
5. **Every state names its way out: a control that state shows which takes the person out of it.**
   Default's are the screen's `exits` and `back`. Every other state's is one of these: try again,
   the value that failed shown editable, cancel, back, or a way to reach someone who can help. A way out
   that keeps the person on the screen (try again, a field to correct) is an `exits` row whose `to` is
   the screen itself, and a comment on that row names the states that show it, because a row belongs
   to the screen and the review holds each state's frame to it. When the cause of a failure is a value
   the person or the product chose (an address, a port, a code), the state shows that value editable,
   or a control that gets a new one, beside try again, because trying again with the same value fails
   the same way. A state with no way out is a gap, because a person who meets it can only close the product.
   Nielsen's heuristics ("10 Usability Heuristics for User Interface Design", NN/g) ask for this: #9,
   error messages "constructively suggest a solution", and #3, "a clearly marked 'emergency exit'" so
   people "avoid getting stuck".

## A way back, per platform

| Family  | What the frame must show                                                                                                                                                               | Source                                                                             |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| iOS     | a navigation bar with the system back button (a chevron, no "Back" word) on every pushed screen; the edge swipe is a shortcut, never the only way; a sheet has Cancel or Done          | Apple Human Interface Guidelines, "Navigation bars", "Sheets"                      |
| Android | a top app bar with the Up arrow on every screen that is not a start destination, beside the system back; a sheet closes by its close control, the scrim and back                       | Material Design 3, "Top app bar"; Android developers, "Principles of navigation"   |
| web     | a breadcrumb on desktop and tablet, a link up to the parent on mobile; the browser's back closes an open overlay                                                                       | Nielsen Norman Group, "Breadcrumbs" and "Accidental Overlay Dismissal"             |
| macOS   | a back control at the far leading edge of the window's toolbar, after the window controls; a pane of a Settings window returns by the pane toolbar, which always shows the active pane | Apple Human Interface Guidelines, "Toolbars", "Windows", "Settings"                |
| Windows | a back button at the top left of the window, in the title bar when the app draws its own, left of the app's icon and title                                                             | Microsoft Learn, "Navigation history and backwards navigation", "Title bar design" |
| GNOME   | a back button at the start of the header bar, top left in a left-to-right locale                                                                                                       | GNOME Human Interface Guidelines, "Browsing", "Header Bars"                        |
| KDE     | back and forward buttons in the toolbar, over the page stack                                                                                                                           | KDE Human Interface Guidelines, "Layout and navigation"                            |

A web pattern drawn on a native target is wrong on that target: a breadcrumb, a hover-only control and
a hamburger menu for primary navigation are web habits each platform guideline names as mistakes.

## A width is not a platform

A web target at 1440 is a page in a desktop browser. A native macOS, Windows or Linux app at the same
width is its own target, with its own family and its own `back`, because its window controls, menus,
shortcuts and settings come from its platform's guideline and the browser supplies none of them. Each
native desktop runtime `profiling-a-product` marks shipped is a target in `zaku.yaml`, and the web
desktop target never stands for it. A Linux app takes `gnome` or `kde`, after the desktop whose
guideline its toolkit follows, because the two place window controls, menus and settings differently.
iPadOS is `ios`: its way back is the iPhone's.

## Before drawing

Write the map entries the change will satisfy first, and report them. The map file's diff is the
contract: it is what a fresh reviewer is handed and checks the drawing against, so it is written, and
kept apart from the drawing's commits, before a frame changes.

## Common Mistakes

| Mistake                                              | Instead                                                  |
| ---------------------------------------------------- | -------------------------------------------------------- |
| Drawing first and updating the map after             | The map entry first, then the frames it names            |
| A state per target ("share sheet", "share dialog")   | One state; the drawing chooses its form per target       |
| `back.web` only, on a screen that targets all        | A `back` for every family it targets                     |
| An Error state named, and nothing it shows to act on | A control in `exits` or `back`, the state in its comment |
| A native frame with a breadcrumb                     | The platform's own way back                              |
| The web desktop target standing for a desktop app    | A target with the desktop platform's family              |
