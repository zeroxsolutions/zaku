# Creation Log: drawing-a-screen

Drafted before its RED runs from the zaku core spec's candidates. After the runs, every rule whose
criterion the control arm already passed is cut and listed below.

## Source material

- Figma Plugin API reference: `SectionNode`, `InstanceNode.setProperties`, `InstanceNode.overrides`,
  `SlotNode`, `importComponentSetByKeyAsync`, layout sizing.
- Apple Human Interface Guidelines and Material Design 3 for the native patterns, through
  `mapping-a-feature`.
- The frame sizes chosen in the research note native-platform-behaviour.md (iOS 402x874, 820x1180,
  1180x820) and web-platform-behaviour.md (1440, 768, 390). The Android sizes are the reference
  devices of Jetpack Compose's `PreviewScreenSizes` (Phone 411x891, Foldable 673x841, Tablet
  1280x800 dp), which replaced the note's 412x915, 820x1180 and 1180x820: those fell inside the
  window size classes but matched no device an Android engineer previews on.
- Images: the Figma plugin's `figma-use` reference (`api-reference.md`, "upload_assets is the ONLY
  supported way") and the `upload_assets` tool schema. Verified on the product file: a JPEG POSTed to
  the `submitUrl` returned `{"success":true,"imageHash":...,"placedOnNodeId":...}` and landed as an
  IMAGE fill.
- Desktop windows, each read on 2026-10-09: App Store Connect, "Screenshot specifications" (undated;
  Mac screenshots "with a 16:10 aspect ratio": 1280x800, 1440x900, 2560x1600, 2880x1800 px) with Apple
  HIG "Typography" (December 16, 2025: "144 ppi for @2x designs"); Microsoft Learn, "Screenshots,
  images, and trailers" (last updated 2025-06-06: desktop "1366 x 768 pixels or larger") and "Screen
  sizes and breakpoints" (2026-07-13: large is 1008 epx and up, window sizes 1024x640, 1366x768,
  1920x1080); GNOME Human Interface Guidelines, "Scaling & Adaptiveness" (undated; "The smallest
  recommended display size for GNOME on desktop is currently 1024x600px, and this size should be
  supported by all apps"); KDE Human Interface Guidelines, "Layout and navigation" (fixed sizes
  "including default and minimum window sizes" are multiples of `gridUnit`, 18 px; no window size).
- Desktop system bars: the guidelines' own terms for the bar the window controls sit in, Apple HIG
  "Windows" ("window controls"), Microsoft Learn "Title bar design", GNOME HIG "Header Bars" (the site
  "for window management features"), KDE HIG "Layout and navigation" ("titlebar"). The kits' own
  component names were not read; `systemBars` takes them.
- Hit regions: Apple Human Interface Guidelines, Buttons ("a button needs a hit region of at least
  44x44 pt"), and Google's Android accessibility help, Touch target size (48x48 dp; a 24x24 dp icon's
  padding makes up its 48x48 dp target; Compose's `minimumInteractiveComponentSize` reserves 48 dp).
- Frame names: no outside convention exists. Figma's handoff guide names pages by readiness and asks
  for named styles and sections; community guides agree only on no default names, no unexplained
  abbreviations, and `/` for hierarchy. The `<title> / <state> / <target name>` shape follows those
  three. RED s1 runs 1 and 2 drew under the earlier `<prefix> - <title> (<state>)` names, whose
  prefixes (`And E`, `iPad L`) the user could not read.
- Arrangement of a screen: shadcn's blocks read from the registry
  (`https://ui.shadcn.com/r/styles/new-york-v4/<block>.json`, `login-01` to `login-05` and
  `signup-01` to `signup-05`) on 2026-10-20; Apple Human Interface Guidelines, "Layout" (updated
  September 9, 2026: "place the most important items near the top and leading side", "keep layout
  changes recognizable and familiar to the platform").

## What was refused

Pending the RED runs.

- A tell list in the body (delve, leverage, "not just X, but Y" and the rest the checker carries): no
  run in either copy scenario wrote one of its phrases, 0 of 12 RED runs, so the body names only the
  checker's `tone` field.
- A rule on what a line says (the real noun, the number, the action): the control arm already wrote
  the record's numbers, a verb on every button and an error that names its failure.
- A rule on arranging a new screen across targets: `test-arranging-a-new-screen.md`'s skill arm
  already centred the heading block and the closing lines and kept every block's alignment on the
  three targets, in all three runs.
- An alignment criterion in `reviewing-a-design`'s checker table: that table lists `zaku check`'s
  checks, and no check reads alignment; the review decides it from the comparison image instead.

## What shipped on weak evidence

- The Iron Law, the rationalization table and the red flags: the user asked what a drawing that leaves
  the design system costs. The control arm cannot skip a rule it never read, so no run has yet shown the
  discipline failure the form answers; the closest is run 3 overriding button heights and citing the
  platform guidelines as its reason. GREEN decides whether the three parts stay or become a recipe.

- Images, system bars and every block of the old drawing: written from s1 RED runs 1 and 2, where the
  cover photo became a grey frame in every frame that showed it and no iPad or Android frame had a
  home indicator or navigation bar. Those runs had neither `upload_assets` nor a shell, so the image
  failure was forced by the harness; a run with both tools has not yet been seen.

- The Verification Checklist: the user recorded that a long drawing session loses the rules it read
  at the start, and asked for a list walked before a screen is reported done. The copy lines in it
  answer RED; the frame, instance, system bar and picture lines restate the body for that walk and
  had no run of their own.

- The desktop frame sizes and the desktop system bars: licensed by a recorded session failure, in which
  a real session repeated "large and extra-large are desktop classes the web covers" as settled,
  treating a width class as a platform, and the user corrected that a native desktop app and a web page
  in a desktop browser differ in menus, windows, shortcuts, back, settings and OS integration; and by
  `../mapping-a-feature/test-mapping-a-feature-for-a-native-mac-app.md`, whose RED skill runs left the
  Mac app out because "the drawing skill gives no macOS frame size". Only the macOS size was run;
  Windows, GNOME and KDE rest on their sources. The window-controls bar had no drawing run.

## Tests

- `test-migrating-a-screen-to-every-target.md`: RED three runs (criteria 3, 6, 9 and 11 failed in all), GREEN not run.
- `test-migrating-a-screen-of-cards.md`: RED not run, GREEN not run.
- `test-migrating-a-list.md`: RED not run, GREEN not run.
- `test-writing-a-screens-copy.md`: RED three runs per arm (criteria 1 and 9 failed in all six, 5 in
  one skill run), GREEN three runs (1 to 8 pass in all; 9 in one, partly in two).
- `test-drafting-a-flows-copy.md`: RED three runs per arm (criterion 4 failed in all six; one skill
  run wrote no copy), GREEN three runs (all four pass in all).
- `../mapping-a-feature/test-mapping-a-feature-for-a-native-mac-app.md`: scores the macOS frame size as
  its criterion 3; RED failed in all six, GREEN drew 1440x900 in all three without naming the source.
- `test-drawing-a-product-with-no-library.md`: RED four runs (each failed criterion 2; the zaku arms
  drew no screens, the Figma arms drew from a library nobody named and could not run the rules),
  GREEN four runs (three pass 1 to 5; the wallet over Figma's server fails 4, its library pages
  unchecked).
- `test-arranging-a-new-screen.md`: RED three runs per arm (skill arm passed all four in all three;
  control run 1 failed 1 and 2), GREEN not run.
- `test-migrating-a-screens-arrangement.md`: the skill reached through its description, no memory, no
  skill named: RED three runs per arm (every skill run invoked it; criteria 1 and 2 failed in all six),
  GREEN three runs (every run invoked it and read `references/shadcn.md`; all four pass in all).

## Iterations

1. Drafted from the spec's candidates.
2. Frame names and Android sizes changed after the user could not read `And E - Auth - Sign in (error)`.
3. Images, system bars and kept blocks added after the user found frame 13:2031 with an empty cover.
4. Control heights follow the design system after s1 run 3 stretched `Button` `Size=default` (32) to 44
   on iOS and 48 on Android by override (28:695 against 27:908). The user ruled that the design system
   is respected as it is: no override and no new library size or mode to meet a platform guideline.
5. Every name and place a drawing tool spells moved out of the body into the tool references, and
   `references/sketch.md` added from the Sketch docs and the Sketch MCP guide: the body had written
   Figma's terms (Sections, auto-layout, property types, uploaded assets, node ids) as the decision, and Sketch spells them differently or lacks them.
6. `references/sketch.md` removed with the Sketch reader in the checker: a skill-arm run on Sketch
   2026.3.1 built a library the user judged far below the Figma one, and the team will not maintain or
   check a second tool. The body stays tool-neutral; Figma is its only reference.
7. A copy section and a Verification Checklist added. RED on two copy scenarios showed every run
   pasting a record's em dash and curly apostrophe into a frame, en dashes, middle dots and arrows in
   drafted lines, and two skill runs reading "Real copy" as a ban on drafting copy no file holds. The
   section states the character rule with its substitution table, says a record's text is rewritten
   before it is placed, and says copy no file holds is drafted and marked proposed. The checklist
   carries the walk before a screen is reported done.
8. Frame sizes and system bars for macOS, Windows, GNOME and KDE windows, and the web desktop row kept
   apart from them, after the recorded session failure and the mapping test's RED runs.
9. The design system a screen is drawn from is chosen in order (the library `zaku.yaml` names, the
   code's own tokens built into a library, a chosen direction), and the rules run on either way of
   reaching the file, after `test-drawing-a-product-with-no-library.md`'s RED: two runs drew no
   screens for want of a library file, and two drew from a library nobody had named and never ran
   the rules.
10. `references/figma.md` names `getMainComponentAsync`, and says `check_rules` answers within a reply
    with every finding counted, after the GREEN runs over zaku's server: both sent a script reading
    `mainComponent`, which the plugin's page-by-page access refuses, and one got a 133,386-character
    `check_rules` answer its client would not take.
11. A web frame takes the arrangement of the design system's own example of that screen, a native
    frame its platform's, and a block keeps one alignment on every target of a state; with
    `references/shadcn.md` listing the blocks. After a recorded session in which a migrated sign-in
    kept the old drawing's left-aligned heading and closing lines inside a centred column, which the
    user flagged, and `test-migrating-a-screens-arrangement.md`'s RED, where all six runs copied the
    old drawing's alignment.
