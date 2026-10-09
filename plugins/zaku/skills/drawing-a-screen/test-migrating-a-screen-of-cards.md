# Test: migrating a screen of option cards

## Prompt

The control arm is the only arm: the skill did not exist. The run is `claude -p "Read prompt.md in this directory and do what it says."` from its own copy of the inputs, and `prompt.md` holds, verbatim:

```
Load no skill other than the figma plugin's, and read no skill file outside it; answer from your own judgement.

In this repo, the product's design is in docs/design, and its new drawing is in the Figma file docs/design/zaku.yaml names, where you work on the page "<page>". Migrate the Onboard 2 - Member screen's default state from its old drawing in docs/design/source into the new Figma file, on every target, using the library. Keep the look of the cards. Then tell me what you drew.
```

`<page>` is the run's own page, `zaku RED <scenario> <n>`. The product's name, its Figma file keys, its preset code and every scratch path were replaced with placeholders.

## Inputs

Every run's directory holds the product's whole `docs/design/` (`zaku.yaml`, fourteen maps, `README.md`, `source/`), `src/components/ui/button.tsx` and `src/app/global.css`. The inputs a task names are pasted below; the other maps are the product's remaining features in the same format.

`docs/design/zaku.yaml`:

```yaml
product: <product>
preset: <preset>
figma: { library: <library file key>, product: <product file key> }
targets:
  - { id: web-desktop, family: web, name: Desktop }
  - { id: web-tablet, family: web, name: Tablet }
  - { id: web-mobile, family: web, name: Mobile }
  - { id: ios-phone, family: ios, name: iPhone }
  - { id: ios-tablet-portrait, family: ios, name: iPad portrait }
  - { id: ios-tablet-landscape, family: ios, name: iPad landscape }
  - { id: android-phone, family: android, name: Android phone }
  - { id: android-foldable, family: android, name: Android foldable }
  - { id: android-tablet, family: android, name: Android tablet }
modes:
  {
    base-color: zinc,
    theme: emerald,
    chart: purple,
    menu-accent: subtle,
    radius: default,
    typography: inter,
    project: <product>,
  }
```

`docs/design/README.md`:

```md
This product's design. `zaku.yaml` names the targets every screen is drawn for and the Figma files.
Each `map/<feature>.yaml` lists a feature's screens, their states, the targets they are drawn for, how
a person arrives (`entry`), leaves (`exits`) and goes back (`back`, per platform family), and the
library components they use. `source/` holds the old drawing of some screens, exported as an image
and an HTML file per frame. A frame in Figma is named `<screen title> / <state> / <target name>`.
```

`docs/design/map/onboarding.yaml`:

```yaml
feature: onboarding
screens:
  onboard-1-name:
    title: Onboard 1 - Name
    states:
      - Default
    targets: all
    entry:
      - from: auth/auth-verify-email
        via: a link or button on Verify email (auth)
    exits:
      - to: onboard-2-<product>ler
        via: a link or button to Onboard 2 - Member
    back:
      web: browser history, then a link up to Verify email (auth)
      ios: navigation bar back button or edge swipe to Verify email (auth)
      android: system back or the top app bar Up arrow to Verify email (auth)
  onboard-2-<product>ler:
    title: Onboard 2 - Member
    states:
      - Default
    targets: all
    entry:
      - from: onboard-1-name
        via: a link or button on Onboard 1 - Name
    exits:
      - to: onboard-3-interests
        via: a link or button to Onboard 3 - Interests
    back:
      web: browser history, then a link up to Onboard 1 - Name
      ios: navigation bar back button or edge swipe to Onboard 1 - Name
      android: system back or the top app bar Up arrow to Onboard 1 - Name
  onboard-3-interests:
    title: Onboard 3 - Interests
    states:
      - Default
    targets: all
    entry:
      - from: onboard-2-<product>ler
        via: a link or button on Onboard 2 - Member
    exits:
      - to: onboard-4-region
        via: a link or button to Onboard 4 - Region
    back:
      web: browser history, then a link up to Onboard 2 - Member
      ios: navigation bar back button or edge swipe to Onboard 2 - Member
      android: system back or the top app bar Up arrow to Onboard 2 - Member
  onboard-4-region:
    title: Onboard 4 - Region
    states:
      - Default
    targets: all
    entry:
      - from: onboard-3-interests
        via: a link or button on Onboard 3 - Interests
    exits:
      - to: onboard-5-permissions
        via: a link or button to Onboard 5 - Permissions
    back:
      web: browser history, then a link up to Onboard 3 - Interests
      ios: navigation bar back button or edge swipe to Onboard 3 - Interests
      android: system back or the top app bar Up arrow to Onboard 3 - Interests
  onboard-5-permissions:
    title: Onboard 5 - Permissions
    states:
      - Default
    targets: all
    entry:
      - from: onboard-4-region
        via: a link or button on Onboard 4 - Region
    exits:
      - to: onboard-6-ready
        via: a link or button to Onboard 6 - Ready
    back:
      web: browser history, then a link up to Onboard 4 - Region
      ios: navigation bar back button or edge swipe to Onboard 4 - Region
      android: system back or the top app bar Up arrow to Onboard 4 - Region
  onboard-6-ready:
    title: Onboard 6 - Ready
    states:
      - Default
    targets: all
    entry:
      - from: onboard-5-permissions
        via: a link or button on Onboard 5 - Permissions
    back:
      web: browser history, then a link up to Onboard 5 - Permissions
      ios: navigation bar back button or edge swipe to Onboard 5 - Permissions
      android: system back or the top app bar Up arrow to Onboard 5 - Permissions
```

The old drawing of the screen, one PNG and one HTML export per frame, the HTML with its embedded images replaced by `data:image/omitted`:

- `docs/design/source/onboarding/onboard-2-member/D-Onboard-2-Member.html`
- `docs/design/source/onboarding/onboard-2-member/D-Onboard-2-Member.png`
- `docs/design/source/onboarding/onboard-2-member/M-Onboard-2-Member.html`
- `docs/design/source/onboarding/onboard-2-member/M-Onboard-2-Member.png`
- `docs/design/source/onboarding/onboard-2-member/T-Onboard-2-Member.html`
- `docs/design/source/onboarding/onboard-2-member/T-Onboard-2-Member.png`

## Pass criteria

Fixed before the first run, and scored from the run's probe of its page, its transcript and the diff of its directory.

1. Every paint on any node of the new frames is bound to a `semantic` variable, or comes from a library instance without an override. The probe lists every paint with no binding.
2. Every option card is an instance of a library component, not a frame or rectangle the run drew.
3. A frame for the default state exists on each of the nine targets.
4. The reply claims nothing the probe contradicts.
5. The option card is one component, placed as an instance for each of the cards in all nine frames.
6. No layer in the new frames keeps a default name (`Frame <n>`, `Rectangle <n>`, `Group <n>`, `Text`).
7. Each frame is named `Onboard 2 - Member / Default / <target name>` and sized for its target: 1440x900, 768x1024 and 390x844 on the web; 402x874, 820x1180 and 1180x820 on iOS; 411x891, 673x841 and 1280x800 on Android.
8. Every iOS frame shows a status bar and a home indicator; every Android frame shows a status bar and a navigation bar or gesture handle.
9. No instance has a size, fill, stroke or effect override on itself or on any node inside it, and no local component copies one the library publishes: a control keeps the design system's height on every target, and where its hit region is under 44x44 pt (iOS) or 48x48 dp (Android), the reply names the control and the region the code has to give it.
10. Every image the old drawing shows is an image fill, never a flat or empty frame.

## RED

Not run.

## GREEN

Not run.

## Measurements

## Limitations

- The skill did not exist, so no skill arm ran at RED.
