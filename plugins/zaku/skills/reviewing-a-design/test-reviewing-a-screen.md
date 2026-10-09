# Test: reviewing a migrated screen

## Prompt

The control arm is the only arm: the skill did not exist. The run is `claude -p "Read prompt.md in this directory and do what it says."` from its own copy of the inputs, and `prompt.md` holds, verbatim:

```
Load no skill other than the figma plugin's, and read no skill file outside it; answer from your own judgement.

In this repo, the product's design is in docs/design, and its new drawing is in the Figma file docs/design/zaku.yaml names, where you work on the page "<page>". The Auth feature's Sign in screen is about to be handed to engineering. Review its design on this page and tell me whether it is ready, and if not, what is wrong. Change nothing.
```

`<page>` is the run's own page, `zaku RED <scenario> <n>`. The product's name, its Figma file keys, its preset code and every scratch path were replaced with placeholders.

The run's page holds a copy of the frames one scenario 1 run drew, the run whose probe found the most failing nodes. If no run left two failing nodes, the copy gets planted defects until it has four: a raw label colour inside a button, a button fixed at 200 px wide where its variant hugs, a missing target frame, and a raw rectangle used as a divider. The answer key is that run's probe plus the planted ids, and it never reaches a prompt.

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

1. The review names every missing frame in the answer key.
2. The review names at least three quarters of the other failing nodes in the answer key, each by node id or by frame and layer.
3. Every finding cites a node id, a frame name or an image. A finding with no location fails.
4. The review does not call the screen ready.

## RED

Control arm, three runs, no skill loaded, each on its own copy of the 27 frames scenario 1's control C
drew. No scenario 1 run left a missing frame among them, and every run left more than two failing
nodes, so nothing was planted. Criterion 2 was scored by failing class, because control C left hundreds
of override nodes: seven classes (A cover as a grey frame, B unstyled text, C size overrides, D paint
overrides, E local components standing in for library parts, F no Sections, G frame sizes off the
table), with three quarters taken as six of seven.

| Run       | 1    | 2    | 3    | 4    |
| --------- | ---- | ---- | ---- | ---- |
| control A | PASS | FAIL | PASS | PASS |
| control B | PASS | FAIL | PASS | PASS |
| control C | PASS | FAIL | PASS | PASS |

- Classes found: control A 2 (A, B), control B 3 (A, B, E), control C 2 (B, D).
- No run named the size overrides, and two praised them. Control A: "The iPhone frames use 44px and the
  Android frames 48px." Control C: "touch-target sizes (32 px web, 44 px iOS, 48 px Android) ... look
  right."
- No run named the missing Sections or the frame sizes off the target table.
- Control A judged the local components "justified"; control B called the same components blocking.
- Every run found defects outside the key: the Error state's Field left at `State=Default`, map exits
  with no control, and library sample copy left in hidden properties.

**Criterion 2 failed in every run: a reviewer without the contract misses what only a count can show.**

## GREEN

Not run.

## Measurements

| Run       | Figma calls | Turns | Cost  | Minutes |
| --------- | ----------- | ----- | ----- | ------- |
| control A | 12          | 24    | $1.35 | 2.3     |
| control B | 6           | 16    | $0.84 | 1.5     |
| control C | 9           | 18    | $0.96 | 2.0     |

## Limitations

- The skill did not exist, so no skill arm ran at RED.
- The copies keep their instances' main components on scenario 1's page; control B noticed and flagged it.
- Criterion 1 is vacuous here: the source run left no frame missing.
