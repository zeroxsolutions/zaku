# zaku: a product draws each target from the library of its style, and a library moves between styles

## Why

On 2026-10-20 travel decided that the shadcn style follows how a target is used, not how wide it is.
The decision record is the team's, not a guideline's. Phones and tablets are touched: iOS, Android,
Web mobile and Web tablet. They take Vega. Web desktop and the macOS, Windows and Linux windows are
used with a pointer, and they keep Nova. The reason is that Nova's controls are 32 high (Button,
Input, Input OTP slot) and its `lg` is 36. Vega's are 36, and Vega's `lg` is 40. Both are below the
44x44 pt and 48x48 dp touch targets that `drawing-a-screen` already cites. Nova is the smaller of the
two. `references/shadcn.md` already says one library per style, so travel now has four libraries:

| File             | Built on         | Serves          |
| ---------------- | ---------------- | --------------- |
| Shadcn UI - Nova | shadcn base-nova | pointer targets |
| ZUI              | Shadcn UI - Nova | pointer targets |
| Shadcn UI - Vega | shadcn base-vega | touch targets   |
| ZUI - Vega       | Shadcn UI - Vega | touch targets   |

zaku cannot say this:

- `zaku.yaml` holds one `figma.library`, and `zaku library save` writes one `design/library.json`.
- `drawing-a-screen` draws every target from "the library `zaku.yaml`'s `figma.library` names".
- The `library` check reads the one snapshot. Today a Nova Button on an iOS frame passes, and a Vega
  Button on the same frame is a finding. That is the reverse of what was decided.

Moving ZUI onto Vega was done by hand on 2026-10-21. The user duplicated the file and the session
swapped its components. Nothing in `building-the-library` covers this, and the session missed two
things:

- Text whose font family is bound per range (`fontFamily` as an array of bindings) kept its Nova
  variable on every Tab Bar label. The remap read only single bindings. The leftover scan found it.
- Eighteen Unsaved Changes Toolbar buttons held a fixed height of 28. That was Nova's `sm`, and Vega's
  is 32. The swap kept the fixed size. When the session resized every fixed instance to its new main,
  four Tab Bar icons that were 20 on purpose shrank to their main component's 16 too. The session put them back by
  hand.

The first miss was found by a check the session wrote for itself. The second was found by reading
screenshots. zaku runs neither of those checks.

## Decisions

1. **A product names each library, and each target names the one it draws from.**
   - `figma.libraries` maps a name to a file key, for example `{ nova: <key>, vega: <key> }`. A
     target takes `library: <name>`.
   - `figma.library` stays and means a single library named `default` that every target draws from.
   - The schema refuses three things: both fields at once; a target that names no library while two
     exist; and a target naming a library that is not listed.
   - A product with one library writes nothing new.
2. **Each library has its own snapshot.** `zaku library save` writes `design/library/<name>.json`
   for each library, or for the one `--library <name>` names. A product on `figma.library` keeps
   `design/library.json`.
3. **The checks read the library of the frame's target.** An outline frame already carries its
   target.
   - The `library` check holds each frame's instances to that target's snapshot. A component from
     another library zaku.yaml names is reported as from the wrong library, naming both. A component
     from a library zaku.yaml does not name is reported as it is today.
   - The binding and style checks do the same for variables and text and effect styles.
   - A map's `components` list passes when every target the screen is drawn for has the name.
4. **`building-the-library` decides the libraries.**
   - A design system whose style rewrites component classes (shadcn's `style`) gets one library per
     style the product uses.
   - Which targets take which style is the product's decision, recorded in `docs/design/decisions/`
     with its reason. Because the decision is about input, the record names each target's input
     (touch or pointer) as well as its family.
   - zaku proposes; the person decides. The skill states which facts the choice rests on: each
     style's control heights against the platform's touch target. It does not state which style wins.
   - A style the product's code does not ship yet is built from the design system's published source
     for that style, the shadcn registry for shadcn. The decision record says the code has not caught
     up, and `zaku recipe` compares only the style the code ships.
5. **`drawing-a-screen` takes the library from the target.** Step 2.1 becomes "the library the
   target names". A screen drawn for two targets on two libraries draws each frame from its own
   library. A component a screen needs that one library lacks is added to that library; it is never
   borrowed from the other one.
6. **Moving a library onto another style is a procedure next to `building-the-library`:**
   `moving-a-library-to-another-style.md`. The `SKILL.md` names it for the moment a library built on
   one style's kit is duplicated to sit on another's. The procedure, in order:
   1. Before any swap, record every instance's main component and each fixed width and height.
   2. Swap only the outermost instance of the old kit, to the set of the same name in the new kit and
      the variant of the same name. Nested instances follow their parent. A set the new kit lacks
      stops the move and is named in the reply.
   3. Remap every binding to the variable of the same collection and name in the new kit. This covers
      single bindings, per-range text bindings, and paint and effect bindings. Remap text and effect
      styles by name, and explicit modes by collection and mode name.
   4. For an instance with a fixed width or height equal to its old main's, take the new main's size.
      A fixed size that differed from the old main's was set on purpose, so it is kept. This is what
      separates the 28-high button from the 20-wide icon.
   5. Rewrite documentation text that names the old style or its measures from the style diff,
      including the cover's badge.
   6. Then run the rules, the leftover check (decision 7), screenshots of each entry, and the overlap
      scan.
7. **No reference to a library outside zaku.yaml.** On a library file and on a product file, the
   `library` check reports every instance, variable binding (range bindings included) and text or
   effect style whose source is not a library zaku.yaml names, or the file's own. After a move, the
   old kit then shows up as findings, not as a scan someone has to remember.

## Out of scope

- How travel's code ships two styles in one web app (a `pointer: coarse` switch, or one build per
  style). That is travel's own spec.
- The React Native registry in `zeroxsolutions/ui`, and whether it gets a Figma file of its own.
- Drawing the Linux window target. It needs no zaku change: `gnome` is already a family.
- A `zaku` command that performs the move. The procedure is the skill's; it becomes a script once a
  second move shows which steps a script can own.

## Tests

Skills are tested by runs through `claude -p` from a scratch directory. Each run is RED before its
skill edit and GREEN after, with the criteria out of the run's reach:

- **Two libraries, one screen.** A product with an iOS phone target and a Web desktop target, and a
  decision record that gives touch to Vega and pointer to Nova. Each library is a file the run can
  read. The run draws sign-in for both targets.
  - RED is expected to draw both frames from `figma.library`, or to record the split only in prose.
  - GREEN draws each frame from its target's library. `zaku.yaml` names both. The check reports
    nothing on either frame, and reports a Nova Button placed on the phone frame as from the wrong
    library.
- **A library moved to another style.** A fresh duplicate of ZUI (Nova), moved to Shadcn UI - Vega.
  The session record above is the recorded failure. A run without the procedure is still made, to
  see what it misses on its own.
  - GREEN leaves zero references to Nova, range bindings included.
  - The toolbar buttons end at 32, and the Tab Bar icons stay 20.
  - The Code Input slots stay 48, the documentation names Vega, and the overlap scan is clean.

Code, written first and seen failing:

- `zaku-config`:
  - `figma.libraries` with `targets[].library` loads.
  - Both fields at once are refused, as is a target naming an unlisted library, and two libraries
    with a target that names none.
  - `figma.library` alone still loads.
- `zaku library save`:
  - Writes one snapshot per library.
  - `--library` writes one.
  - `figma.library` still writes `design/library.json`.
- `library` check:
  - A frame is held to its target's snapshot, and an instance from the other named library is
    reported naming both.
  - A variable or style from a library zaku.yaml does not name is reported, a per-range `fontFamily`
    binding included.
