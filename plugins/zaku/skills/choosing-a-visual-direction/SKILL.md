---
name: choosing-a-visual-direction
description: Use when a product has no brand of its own and its first screen, library or style is about to be drawn
---

# Choosing a Visual Direction

> **Stack assumptions: Figma, and shadcn or a DTCG token export.** The decisions here hold on any
> stack; the spellings do not, so this file names no layer's package, import or call. Before writing
> code, config or a command against one of these layers, read its reference (`references/figma.md`),
> and for the token source, `building-the-library`'s `references/shadcn.md` or `references/dtcg.md`,
> which spell each decision for that layer and name what has to survive its replacement.

## Overview

**Core principle:** a product's look is chosen for the people who use it, from its profile and from
research, and every value a data set offers is a candidate those people have to confirm.

A product drawn on its UI kit's defaults looks like every other product on that kit, and nobody chose
it: the colour a wallet's pay button wears, the type a tourist reads a place name in, the density a
desk user scans a list at. Engineering then ships the defaults, and the brand is decided by whoever
first changes a token, with no record of why.

## When to Use

The skill runs when both hold:

- `zaku.yaml` names no library (`figma.library`), or names none whose tokens are the product's own;
- the code's token source holds only its UI kit's defaults, or there is no code yet. A shadcn app
  whose theme variables are the preset's own values, as `references/directions.md`'s scales table
  lists them for shadcn, is on defaults.

A product whose code already sets its own tokens has a brand: `building-the-library` builds the
library from them, and this skill does not run.

## The direction, in order

### 1. The profile entries it reads

Read `docs/design/profile.md` (`profiling-a-product` writes it when it is missing). The record names
the entries the direction rests on: the actor and its segments, their markets and cultures, their
age and digital skill, the stakes of the task (money, safety, play), and the runtimes. A direction
for an audience the profile does not hold adds that entry first, as an assumption with its question.

### 2. The research

Every claim about the audience or the market goes through `researching-a-claim`, from its primary
source:

- what the product's competitors and its market's leaders look like, from their own published screens,
  brand pages or store listings;
- what a colour, a symbol or a motif means to the audience, and to the destination where the two
  differ, from anthropological, government, museum or peer-reviewed sources;
- what the runtimes require of type and colour: contrast, dynamic type, dark mode.

### 3. The candidates

`references/directions.md` is the data set: type families with the scripts they cover, the scales of
published design systems, colour meanings by culture, and domain conventions, each row with its
source. Take candidates from it by table and row. A row is a candidate, never a reason: a value is
kept only when the profile and the research support it for this audience, and the record says which
entries and sources do. A convention a market's leaders share ("wallets here are blue") is evidence of
what users have learned to read, not of what this product should be, so the record says which it
takes and why.

Every family a direction keeps covers every script `zaku.yaml`'s `copy.locales` is written in, read
from the data set's scripts column or the family's own source. A family without a script falls back to
the device's font for that script, and every screen in that language is set in two faces.

### 4. Two or three directions

Each direction is:

- **tokens**: colour roles in light and dark (background, foreground, primary and its foreground,
  secondary, muted, accent, destructive, border, input, ring, and any role the UI kit names), the type
  families and scale, the radius steps, the spacing base, the density and the motion, written in the
  token source's format (step 6);
- **a voice**: how the copy speaks, in two or three lines with one example label, one error and one
  confirmation;
- **its contrast**: every text and background pair and every UI part against its surface, with its
  ratio. WCAG 2.2 asks 4.5:1 for text (success criterion 1.4.3) and 3:1 for a UI component's boundary
  and states (1.4.11); a pair under either is changed before the direction is shown;
- **its board** in the product file: its palette, its type ramp in its families, and one block of the
  feature drawn in it. The reference spells the board.

The directions differ in what they would mean to the audience, not in hue alone: a direction that only
shifts the primary colour is the same direction twice.

### 5. The pick

The person picks one. A run nobody can answer (no one replies, or the prompt says not to ask) takes the
direction it recommends, and the reply and the record both say it was proposed, not chosen, so the
person reopens it.

### 6. Where the pick is written

- `docs/design/decisions/visual-direction.md`: the profile entries read, the research with its sources,
  the data set rows taken by table and row, every direction with its tokens, voice and contrast table,
  which was picked or proposed, why the others lost, and what would reopen it.
- **The code's token source.** A shadcn app's theme variables are set in its stylesheet, and
  `zaku.yaml`'s `designSystem` stays shadcn. A product with no UI kit gets DTCG token files, and
  `zaku.yaml`'s `designSystem.dtcg` names them with its contrast pairs.
- Then `zaku tokens` and `zaku check`, whose contrast check reads the pairs from the tokens the code
  now holds, and `building-the-library`, which builds the library from them, into the product file
  when there is no library file.

## Common Rationalizations

| Excuse                                              | Reality                                                                                |
| --------------------------------------------------- | -------------------------------------------------------------------------------------- |
| "The data set says this domain is blue"             | A row is a candidate; the audience's research decides whether it holds                 |
| "The kit's defaults are a direction"                | Nobody chose them for this audience; they are what every product on the kit looks like |
| "I was told not to ask, so I skip the direction"    | Take the one you recommend and mark it proposed                                        |
| "The contrast looks fine"                           | The ratio is computed for every pair and listed; a look is not a ratio                 |
| "One direction is enough, the person can change it" | Two or three let the person see what the choice is; one is a default with a new name   |

## Verification Checklist

- [ ] The record names the profile entries the direction rests on
- [ ] Every claim about the audience or market cites its primary source
- [ ] Every value kept names its data set row, and why it fits this audience
- [ ] Every family covers every script `copy.locales` is written in
- [ ] Two or three directions, each with tokens, voice, contrast table and board
- [ ] Every text pair is at least 4.5:1 and every UI part at least 3:1
- [ ] The pick is said to be chosen or proposed, in the reply and the record
- [ ] The tokens are in the code's token source, `zaku tokens` and `zaku check` ran, and the library
      was built from them before any screen
