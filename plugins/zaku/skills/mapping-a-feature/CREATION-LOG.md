# Creation Log: mapping-a-feature

Drafted before its RED runs from the zaku core spec's candidates and the platform research. After the
runs, every rule whose criterion the control arm already passed is cut and listed below.

## Source material

- Apple Human Interface Guidelines, "Navigation bars", "Tab bars", "Sheets" (read 2026-10-07).
- Material Design 3, "Top app bar", "Navigation bar", "Bottom sheets"; Android developers, "Principles
  of navigation" and "Predictive back".
- Nielsen Norman Group, "Breadcrumbs: 11 Design Guidelines for Desktop and Mobile" and "Accidental
  Overlay Dismissal" (18 September 2022).
- The research notes behind the spec: native-platform-behaviour.md and web-platform-behaviour.md.
- The desktop rows, each read on 2026-10-09: Apple Human Interface Guidelines, "Toolbars" (change log
  December 16, 2025: "Elements that let people return to the previous document ... appear at the far
  leading edge"), "Windows" (June 9, 2025: window controls at the leading edge of the toolbar) and
  "Settings" (June 10, 2024: a pane toolbar "that remains visible and always indicates the active
  toolbar button"); Microsoft Learn, "Navigation history and backwards navigation" (last updated
  2026-09-19: "place the back button in the upper left corner of your app", in the title bar when the
  app customises it) and "Title bar design" (2024-07-31: the back button left of the icon or title);
  GNOME Human Interface Guidelines, "Browsing" and "Header Bars" (undated; repository last changed
  2026-06-20: "the standard position for the back button is the top-left"); KDE Human Interface
  Guidelines, "Layout and navigation" (repository last changed 2026-09-14: "back/forward buttons in
  the toolbar" over Kirigami's page stack).
- Jakob Nielsen, "10 Usability Heuristics for User Interface Design", Nielsen Norman Group (published
  April 24, 1994; last reviewed January 30, 2024; read 2026-10-09): #9, "Help Users Recognize,
  Diagnose, and Recover from Errors", error messages "constructively suggest a solution"; #3, users
  "need a clearly marked 'emergency exit'", and exits let them "avoid getting stuck". No platform
  guideline was read for this rule.

## What was refused

Pending the RED runs.

- One `linux` family: GNOME and KDE each publish a guideline, and they place window controls (close
  only, at the right, against minimise, maximise and close), menus (a primary menu against a menubar
  or hamburger) and settings differently, so one family would stand for two platforms, the mistake
  this edit answers at a smaller scale.
- An `ipados` family: no check and no row reads a rule that differs from iOS; the way back is the same
  toolbar back button.
- A `state` key on an `exits` row, which would let the checker tie each way out to its state. This
  change is skills only; the comment on the row carries the tie until the schema and checker gain one.
- A rule that a `via` names a control, not an event ("Helper answered on the port"): step 3 already
  says so, and every skill-arm run obeyed it; only the control arm named events.
- A Settings entry per platform (the macOS app menu's Settings... item and Command-Comma): no criterion
  scored it and the brief asked for the way back; it stays in the research.

## What shipped on weak evidence

Pending the RED runs.

- "A width is not a platform": a real session repeated "large and extra-large are desktop classes the
  web covers" as settled, treating a width class as a platform; the user corrected that a native
  desktop app and a web page in a desktop browser differ in menus, windows, shortcuts, back, settings
  and OS integration. The RED runs reproduced the consequence (no run gave the Mac app a family of its
  own) and not the sentence, since the schema offered no family to give.
- The Windows, GNOME and KDE rows: no run mapped a target of those families.
- "The value that failed shown editable": a recorded session built and merged a plugin panel that
  paired with a local server. The port was fixed, and the "Not connected" state offered no action: no
  field to change the port and no retry, so the user was stuck until they caught it. The RED runs of
  `test-mapping-the-ways-out-of-a-pairing-feature.md` reproduced the missing way out in every map
  (criterion 1, 6/6) but drew the port field in 5/6 replies' prose, so the port clause rests on that
  session.

## Tests

- `test-adding-the-native-version-of-a-screen.md`: RED not run, GREEN not run.
- `test-mapping-a-feature-for-a-native-mac-app.md`: RED three runs per arm (criteria 1, 3, 4 and 5
  failed in all six), GREEN three runs (1, 2, 4 and 5 pass in all; 3 fails as written in all, the
  size being the table's with no source repeated).
- `test-mapping-the-ways-out-of-a-pairing-feature.md`: RED three runs per arm (criterion 1 failed in all
  six, criterion 3 in five), GREEN three runs (all four criteria pass in all three).

## Iterations

1. Drafted from the spec's candidates.
2. Families `macos`, `windows`, `gnome` and `kde`, a way back for each, and "A width is not a
   platform", after the recorded session failure and the RED runs of
   `test-mapping-a-feature-for-a-native-mac-app.md`.
3. Every state names its way out, an `exits` row to the screen itself for one that keeps the person
   there, with the states in a comment; a failure caused by a chosen value shows it editable. After the
   recorded session failure and the RED runs of `test-mapping-the-ways-out-of-a-pairing-feature.md`.
