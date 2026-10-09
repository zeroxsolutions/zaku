# Test: adding the iOS and Android versions of a web-only screen

## Prompt

The control arm is the only arm: the skill did not exist. The run is `claude -p "Read prompt.md in this directory and do what it says."` from its own copy of the inputs, and `prompt.md` holds, verbatim:

```
Load no skill other than the figma plugin's, and read no skill file outside it; answer from your own judgement.

In this repo, the product's design is in docs/design, and its new drawing is in the Figma file docs/design/zaku.yaml names, where you work on the page "<page>". The Community feature's Post screen exists only for the web so far. Design its iOS and Android versions, following each platform's own conventions, update whatever else needs updating, then tell me what you changed.
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

`docs/design/map/community.yaml (this scenario's copy, with Post on the three web targets only)`:

```yaml
feature: community
screens:
  community-feed:
    title: Feed
    root: true
    states:
      - Default
      - Loading
      - Empty
      - Error
    targets: all
    entry:
      - url: /community
    exits:
      - to: community-post
        via: a link or button to Post
      - to: community-composer
        via: a link or button to Composer
  community-post:
    title: Post
    states:
      - Default
      - Loading
    targets:
      - web-desktop
      - web-tablet
      - web-mobile
    entry:
      - from: community-feed
        via: a link or button on Feed
      - url: /community/posts/{postId}
    exits:
      - to: community-author
        via: a link or button to Author
      - to: community-report
        via: a link or button to Report
    back:
      web: browser history, then a link up to Feed
  community-composer:
    title: Composer
    states:
      - Default
    targets: all
    entry:
      - from: community-feed
        via: a link or button on Feed
      - url: /community/posts/new
    back:
      web: browser history, then a link up to Feed
      ios: navigation bar back button or edge swipe to Feed
      android: system back or the top app bar Up arrow to Feed
  community-author:
    title: Author
    states:
      - Default
      - Locked
    targets: all
    entry:
      - from: community-post
        via: a link or button on Post
    back:
      web: browser history, then a link up to Post
      ios: navigation bar back button or edge swipe to Post
      android: system back or the top app bar Up arrow to Post
  community-report:
    title: Report
    states:
      - Default
    targets: all
    entry:
      - from: community-post
        via: a link or button on Post
    back:
      web: browser history, then a link up to Post
      ios: navigation bar back button or edge swipe to Post
      android: system back or the top app bar Up arrow to Post
```

The old drawing of the screen, one PNG and one HTML export per frame, the HTML with its embedded images replaced by `data:image/omitted`:

- `docs/design/source/community/community-post/D-Community-Post-loading.html`
- `docs/design/source/community/community-post/D-Community-Post-loading.png`
- `docs/design/source/community/community-post/D-Community-Post.html`
- `docs/design/source/community/community-post/D-Community-Post.png`
- `docs/design/source/community/community-post/M-Community-Post-loading.html`
- `docs/design/source/community/community-post/M-Community-Post-loading.png`
- `docs/design/source/community/community-post/M-Community-Post.html`
- `docs/design/source/community/community-post/M-Community-Post.png`
- `docs/design/source/community/community-post/T-Community-Post-loading.html`
- `docs/design/source/community/community-post/T-Community-Post-loading.png`
- `docs/design/source/community/community-post/T-Community-Post.html`
- `docs/design/source/community/community-post/T-Community-Post.png`

## Pass criteria

Fixed before the first run, and scored from the run's probe of its page, its transcript and the diff of its directory.

1. A frame for each state of `Post` (Default, Loading) exists on each of the six iOS and Android targets: 12 frames.
2. Every iOS frame shows a way back: a navigation bar with a back button, or a sheet with a close or cancel control. Every Android frame shows a top app bar with a navigation icon, or a sheet with a close control.
3. The map entry for `community-post` lists the iOS and Android targets (or `all`) and has `back.ios` and `back.android`, each naming the gesture or control and the screen it returns to.
4. No iOS or Android frame holds a breadcrumb, a hover-only control or a web-only link row.
5. Each frame is named `Post / <state> / <target name>` and sized for its target: 402x874, 820x1180 and 1180x820 on iOS; 411x891, 673x841 and 1280x800 on Android.
6. Every iOS frame shows a status bar and a home indicator; every Android frame shows a status bar and a navigation bar or gesture handle.
7. No instance has a size, fill, stroke or effect override on itself or on any node inside it, and no local component copies one the library publishes: a control keeps the design system's height on every target, and where its hit region is under 44x44 pt (iOS) or 48x48 dp (Android), the reply names the control and the region the code has to give it.
8. Every image the web version shows (a photo, an avatar) is an image fill in the native frames, never a flat or empty frame.

## RED

Not run.

## GREEN

Not run.

## Measurements

## Limitations

- The skill did not exist, so no skill arm ran at RED.
