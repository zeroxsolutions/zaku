# Test: mapping a feature for a product that ships a native macOS app beside the web and iOS

## Prompt

Each run is `claude -p` with the model `claude-opus-5-5`, from its own `mktemp -d` copy of the inputs,
with only the Read, Grep, Glob, WebFetch and WebSearch tools, slash commands and skills disabled, no MCP
server, and `ENABLE_CLAUDEAI_MCP_SERVERS=false`. The scratch paths were replaced with `<skills>`.

The control arm, verbatim:

```
Load no skill, and read no skill file; answer from your own judgement.

This repo's product design is in docs/design, and docs/product-profile.md says which runtimes the product ships. We are adding a Settings feature: a Settings screen, reached from the Account menu, that lists three sections (Profile, Notifications and Privacy), each its own screen where the person changes those settings. Map the feature's screens in docs/design/map/settings.yaml, and change docs/design/zaku.yaml if its targets need it. You cannot write files here, so reply with the full new content of every file you would write or change, and the frame size you would draw each target at.
```

The skill arm, verbatim, `<skills>` holding the skill as it stood on master at RED and the changed
copy at GREEN:

```
Read `<skills>/mapping-a-feature/SKILL.md` and `<skills>/drawing-a-screen/SKILL.md` before you start, and follow them. Where those files and an installed skill of the same name disagree, those files win.

This repo's product design is in docs/design, and docs/product-profile.md says which runtimes the product ships. We are adding a Settings feature: a Settings screen, reached from the Account menu, that lists three sections (Profile, Notifications and Privacy), each its own screen where the person changes those settings. Map the feature's screens in docs/design/map/settings.yaml, and change docs/design/zaku.yaml if its targets need it. You cannot write files here, so reply with the full new content of every file you would write or change, and the frame size you would draw each target at.
```

## Inputs

Each run's `docs/design/` also held `zaku.schema.json` and `map.schema.json` as the plugin ships them:
master's at RED (families `web`, `ios`, `android`), the changed ones at GREEN.

`docs/product-profile.md`:

```md
# Product profile: <product>

Updated <date>. Owner: the product lead.

A notes app for freelancers: notes, invoices drafted from notes, and reminders.

## Runtimes

| Runtime         | Width classes                | Shipped | Why                                                     |
| --------------- | ---------------------------- | ------- | ------------------------------------------------------- |
| iOS, native     | compact                      | yes     | most notes are taken on a phone                         |
| iPadOS, native  | medium, expanded             | yes     | the same app; invoices are reviewed on an iPad          |
| Android, native | -                            | no      | not before the iOS app has paying users                 |
| macOS, native   | expanded, large, extra-large | yes     | invoices are written at a desk; ships with this release |
| Windows, native | -                            | no      | the web serves Windows users for now                    |
| Linux, native   | -                            | no      | no demand measured                                      |
| Web on iOS      | compact                      | yes     | shared links open in the browser                        |
| Web on iPadOS   | medium, expanded             | yes     | as above                                                |
| Web on Android  | compact, medium              | yes     | as above                                                |
| Web on macOS    | expanded, large, extra-large | yes     | sign-up and billing                                     |
| Web on Windows  | expanded, large, extra-large | yes     | the only Windows client                                 |
| Web on Linux    | expanded, large, extra-large | yes     | as above                                                |

The shipped rows are the ones `docs/design/zaku.yaml` draws targets from.
```

`docs/design/zaku.yaml`:

```yaml
product: <product>
designSystem: { shadcn: { preset: aCm3pr3s7 } }
figma: { library: LIBKEY, product: PRODKEY }
targets:
  - { id: web-desktop, family: web, name: Desktop }
  - { id: web-tablet, family: web, name: Tablet }
  - { id: web-mobile, family: web, name: Mobile }
  - { id: ios-phone, family: ios, name: iPhone }
  - { id: ios-tablet-portrait, family: ios, name: iPad portrait }
```

`docs/design/map/account.yaml`:

```yaml
feature: account
screens:
  account-menu:
    title: Account
    root: true
    states: [Default]
    targets: all
    entry:
      - { url: /account }
    exits:
      - { to: sign-out, via: Sign out }
  sign-out:
    title: Sign out
    states: [Default, Error]
    targets: all
    entry:
      - { from: account-menu, via: Sign out }
    back:
      web: Cancel, back to Account
      ios: Cancel in the sheet, back to Account
```

`docs/design/README.md`:

```md
This product's design. `zaku.yaml` names the targets every screen is drawn for and the Figma files;
`zaku.schema.json` and `map.schema.json` are the JSON Schemas both kinds of file are validated against.
Each `map/<feature>.yaml` lists a feature's screens, their states, the targets they are drawn for, how
a person arrives (`entry`), leaves (`exits`) and goes back (`back`, per platform family), and the
library components they use. A frame in Figma is named `<screen title> / <state> / <target name>`.
```

## Pass criteria

Fixed before the first run. Criteria 1 and 4 were scored by validating the reply's YAML against the
run's own schemas.

1. `zaku.yaml` holds a target for the native macOS app whose family is not `web`, and the run's
   `zaku.schema.json` accepts the file.
2. The web desktop target is kept, and the reply does not say or imply that the web desktop frame
   stands for the macOS app, or the macOS frame for the web.
3. The macOS target's frame size is given with a source from Apple (the HIG or App Store Connect); a
   size with no source, or one justified only as matching the web desktop frame, fails.
4. Every settings screen that is not a root has a `back` for every family it targets, the macOS family
   included, and `settings.yaml` validates against the run's `map.schema.json`.
5. The macOS `back` names a macOS way back (the toolbar's back control at its leading edge, the Settings
   window's pane toolbar, or closing the window), never a breadcrumb, browser history or an iOS
   navigation-bar chevron.

## RED

No run, in either arm, gave the macOS app a target of its own family. All six fail criteria 1, 3, 4 and
5; criterion 2 passes in all six.

- Control 1: two Mac targets under `family: ios`, 1440x900 and 1920x1080, no source: "I put the Mac
  targets under `ios`. They are SwiftUI/Apple-native, and the `ios` value in `back` reads correctly on
  them."
- Control 2: no Mac target: "there's no macOS target below, and the Mac app gets no frames." It
  recommended adding a `macos` family to both schemas.
- Control 3: three Mac targets under `family: ios`: "I put the macOS native targets under `ios`. As a
  result, they use the `back.ios` wording."
- Skill 1: no Mac target: "macOS native ships with this release but can't be a target." It also found
  that `systemBars` could not name iOS alone: "the schema also requires an `android` entry".
- Skill 2: no Mac target: "I haven't faked one (for example, by calling it iOS). Adding macOS needs a
  schema change by whoever owns zaku."
- Skill 3: no Mac target: "the schema only allows the families `web`, `ios` and `android`, and the
  drawing skill gives no macOS frame size."

## GREEN

All three runs add `{ id: macos, family: macos, name: Mac }`; both files validate against the changed
schemas.

| Criterion | Run 1                                      | Run 2                                        | Run 3                                    |
| --------- | ------------------------------------------ | -------------------------------------------- | ---------------------------------------- |
| 1         | pass                                       | pass                                         | pass                                     |
| 2         | pass                                       | pass ("`web-desktop` can't stand in for it") | pass                                     |
| 3         | fail: 1440x900, no source named            | fail: 1440x900, no source named              | fail: 1440x900, no source named          |
| 4         | pass                                       | pass                                         | pass                                     |
| 5         | pass: the pane toolbar, closing the window | pass: the pane toolbar, the close button     | pass: the pane toolbar, the close button |

Every run left the Settings index off the Mac in `omits`, with the HIG's reason: "a macOS Settings
window opens straight onto a pane, and its pane toolbar is the list of sections" (run 3), so its `back`
carries no `macos` key, as criterion 4 allows.

## Measurements

`claude-opus-5-5`; three runs per arm at RED, three skill-arm runs at GREEN. The first RED batch printed
nothing on five of these six runs; those five were run again with JSON output and stdin closed, and the
one that had printed was kept.

## Limitations

- Criterion 3 asks the reply to name the size's source; the skill carries the source and the runs drew
  the skill's size without repeating it. No round was spent making replies cite it.
- The scenario asks for a map, not a drawing, so no run drew a frame, and the window-controls bar was
  not exercised.
- Windows, GNOME and KDE targets were not run; their rows rest on the sources the log names.
