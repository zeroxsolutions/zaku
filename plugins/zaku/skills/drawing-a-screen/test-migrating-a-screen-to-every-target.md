# Test: migrating a screen with three states to every target

## Prompt

The control arm is the only arm: the skill did not exist. The run is `claude -p "Read prompt.md in this directory and do what it says."` from its own copy of the inputs, and `prompt.md` holds, verbatim:

```
Load no skill other than the figma plugin's, and read no skill file outside it; answer from your own judgement.

In this repo, the product's design is in docs/design, and its new drawing is in the Figma file docs/design/zaku.yaml names, where you work on the page "<page>". Migrate the Auth feature's Sign in screen from its old drawing in docs/design/source into the new Figma file, using the library. Then tell me what you drew.
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

`docs/design/map/auth.yaml`:

```yaml
feature: auth
screens:
  welcome:
    title: Welcome
    root: true
    states:
      - Default
    targets: all
    entry:
      - url: /
    exits:
      - to: auth-sign-in
        via: a link or button to Sign in
      - to: auth-sign-up
        via: a link or button to Sign up
  auth-sign-in:
    title: Sign in
    states:
      - Default
      - Phone
      - Error
    targets: all
    entry:
      - from: welcome
        via: a link or button on Welcome
      - url: /sign-in
    exits:
      - to: auth-sms-code
        via: a link or button to SMS code
      - to: auth-magic-link-sent
        via: a link or button to Magic link sent
      - to: auth-reset-password
        via: a link or button to Reset password
      - to: auth-new-password
        via: a link or button to New password
      - to: auth-deletion-scheduled
        via: a link or button to Deletion scheduled
    back:
      web: browser history, then a link up to Welcome
      ios: navigation bar back button or edge swipe to Welcome
      android: system back or the top app bar Up arrow to Welcome
  auth-sign-up:
    title: Sign up
    states:
      - Default
    targets: all
    entry:
      - from: welcome
        via: a link or button on Welcome
      - url: /sign-up
    exits:
      - to: auth-verify-email
        via: a link or button to Verify email
    back:
      web: browser history, then a link up to Welcome
      ios: navigation bar back button or edge swipe to Welcome
      android: system back or the top app bar Up arrow to Welcome
  auth-sms-code:
    title: SMS code
    states:
      - Default
    targets: all
    entry:
      - from: auth-sign-in
        via: a link or button on Sign in
    back:
      web: browser history, then a link up to Sign in
      ios: navigation bar back button or edge swipe to Sign in
      android: system back or the top app bar Up arrow to Sign in
  auth-magic-link-sent:
    title: Magic link sent
    states:
      - Default
    targets: all
    entry:
      - from: auth-sign-in
        via: a link or button on Sign in
      - url: /sign-in-link
    back:
      web: browser history, then a link up to Sign in
      ios: navigation bar back button or edge swipe to Sign in
      android: system back or the top app bar Up arrow to Sign in
  auth-verify-email:
    title: Verify email
    states:
      - Default
    targets: all
    entry:
      - from: auth-sign-up
        via: a link or button on Sign up
      - url: /verify-email
    exits:
      - to: onboarding/onboard-1-name
        via: a link or button to Onboard 1 - Name (onboarding)
    back:
      web: browser history, then a link up to Sign up
      ios: navigation bar back button or edge swipe to Sign up
      android: system back or the top app bar Up arrow to Sign up
  auth-reset-password:
    title: Reset password
    states:
      - Default
    targets: all
    entry:
      - from: auth-sign-in
        via: a link or button on Sign in
      - url: /reset-password
    back:
      web: browser history, then a link up to Sign in
      ios: navigation bar back button or edge swipe to Sign in
      android: system back or the top app bar Up arrow to Sign in
  auth-new-password:
    title: New password
    states:
      - Default
    targets: all
    entry:
      - from: auth-sign-in
        via: a link or button on Sign in
      - url: /new-password
    back:
      web: browser history, then a link up to Sign in
      ios: navigation bar back button or edge swipe to Sign in
      android: system back or the top app bar Up arrow to Sign in
  auth-deletion-scheduled:
    title: Deletion scheduled
    states:
      - Default
    targets: all
    entry:
      - from: auth-sign-in
        via: a link or button on Sign in
    back:
      web: browser history, then a link up to Sign in
      ios: navigation bar back button or edge swipe to Sign in
      android: system back or the top app bar Up arrow to Sign in
```

The old drawing of the screen, one PNG and one HTML export per frame, the HTML with its embedded images replaced by `data:image/omitted`:

- `docs/design/source/auth/auth-sign-in/D-Auth-Sign-in-Phone.html`
- `docs/design/source/auth/auth-sign-in/D-Auth-Sign-in-Phone.png`
- `docs/design/source/auth/auth-sign-in/D-Auth-Sign-in-error.html`
- `docs/design/source/auth/auth-sign-in/D-Auth-Sign-in-error.png`
- `docs/design/source/auth/auth-sign-in/D-Auth-Sign-in.html`
- `docs/design/source/auth/auth-sign-in/D-Auth-Sign-in.png`
- `docs/design/source/auth/auth-sign-in/M-Auth-Sign-in-Phone.html`
- `docs/design/source/auth/auth-sign-in/M-Auth-Sign-in-Phone.png`
- `docs/design/source/auth/auth-sign-in/M-Auth-Sign-in-error.html`
- `docs/design/source/auth/auth-sign-in/M-Auth-Sign-in-error.png`
- `docs/design/source/auth/auth-sign-in/M-Auth-Sign-in.html`
- `docs/design/source/auth/auth-sign-in/M-Auth-Sign-in.png`
- `docs/design/source/auth/auth-sign-in/T-Auth-Sign-in-Phone.html`
- `docs/design/source/auth/auth-sign-in/T-Auth-Sign-in-Phone.png`
- `docs/design/source/auth/auth-sign-in/T-Auth-Sign-in-error.html`
- `docs/design/source/auth/auth-sign-in/T-Auth-Sign-in-error.png`
- `docs/design/source/auth/auth-sign-in/T-Auth-Sign-in.html`
- `docs/design/source/auth/auth-sign-in/T-Auth-Sign-in.png`

## Pass criteria

Fixed before the first run, and scored from the run's probe of its page, its transcript and the diff of its directory.

1. A frame named for each of the three states of `Sign in` (Default, Phone, Error), on each of the nine targets, exists on the run's page: 27 frames.
2. The reply lists every frame it drew, and claims no frame the probe does not find.
3. Every node in those frames is inside a library instance, or is a frame whose only job is layout (no fill, stroke or effect of its own).
4. Every text outside an instance uses a library text style.
5. A block drawn in more than one of the 27 frames (a header, the form, the provider buttons) is an instance of one component in every frame it appears in, not plain frames redrawn per frame.
6. On the run's page, the frames sit in a Section named `Sign in`, inside one Section per state named as the map spells it.
7. No layer in the new frames keeps a default name (`Frame <n>`, `Rectangle <n>`, `Group <n>`, `Text`).
8. Each frame is named `Sign in / <state> / <target name>` and sized for its target: 1440x900, 768x1024 and 390x844 on the web; 402x874, 820x1180 and 1180x820 on iOS; 411x891, 673x841 and 1280x800 on Android.
9. Every block of the old drawing appears in every frame of its state wherever the old drawing at that width shows it: the logo, the heading, the form, the provider buttons, the sign-up link, and the cover photo as an image, never an empty or flat-colour frame.
10. Every iOS frame shows a status bar and a home indicator; every Android frame shows a status bar and a navigation bar or gesture handle.
11. No instance in the 27 frames has a size, fill, stroke or effect override on itself or on any node inside it, no local component copies one the library publishes, and the library file is unchanged.

## RED

Control arm, three runs, no skill loaded. Runs 1 and 2 had the earlier inputs, whose `zaku.yaml` named
targets by prefix (`D`, `T`, `M`, `iPhone`, `iPad P`, `iPad L`, `And C`, `And M`, `And E`) and whose
frames were named `<prefix> - <title> (<state>)`, so criterion 8 does not apply to them. Criteria 8 to 11
were added after runs 1 and 2 and scored on all three from each page's probe.

| Run       | 1    | 2    | 3    | 4    | 5    | 6    | 7          | 8    | 9    | 10   | 11   |
| --------- | ---- | ---- | ---- | ---- | ---- | ---- | ---------- | ---- | ---- | ---- | ---- |
| control A | PASS | FAIL | FAIL | PASS | PASS | FAIL | PASS       | n/a  | FAIL | FAIL | FAIL |
| control B | FAIL | PASS | FAIL | FAIL | FAIL | FAIL | not scored | n/a  | FAIL | n/a  | FAIL |
| control C | PASS | PASS | FAIL | FAIL | FAIL | FAIL | PASS       | FAIL | FAIL | PASS | FAIL |

- Control B drew the 9 web frames and none of the 18 native ones: "The 18 iOS and Android frames ...
  still need drawing from scratch."
- Every run drew the cover photo as a grey frame. Control C: "The Figma tools here can't fetch the
  Unsplash image and I have no shell to upload it."
- No run placed a frame in a screen or state Section.
- Control C named every frame correctly but sized 5 of 9 targets its own way (iPhone 393x852, iPad
  834x1194, web tablet 834x1112, Android phone 412x915), and stretched `Button` `Size=default` from 32 to
  44 on iOS and 48 on Android by override: "Controls are 44pt tall ... Controls are 48dp tall."
- Control B's probe counted default names inside library instances; criterion 7 was not rescored for it.

**Criterion 7 passed in both runs scored, so no rule ships for default layer names on this scenario's
evidence.** Criteria 3, 6, 9 and 11 failed in every run.

## GREEN

Not run.

## Measurements

| Run       | Figma calls | Turns | Cost  | Minutes |
| --------- | ----------- | ----- | ----- | ------- |
| control A | 29          | 50    | $2.38 | 7.5     |
| control B | 30          | 54    | $2.97 | 8.1     |
| control C | 37          | 58    | $2.92 | 9.2     |

## Limitations

- The skill did not exist, so no skill arm ran at RED.
- No run could reach `upload_assets` or a shell, so criterion 9 was forced to fail by the harness. A
  later run with both is the evidence criterion 9 needs.
- Runs 1 and 2 had the earlier names and inputs; only run 3 is comparable on criterion 8.
- The library file held a planted `Button (fixture)` for another scenario; control B found it and named
  it in its reply.
