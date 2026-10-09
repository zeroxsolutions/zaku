# Test: migrating a list of rows with icons and buttons

## Prompt

The control arm is the only arm: the skill did not exist. The run is `claude -p "Read prompt.md in this directory and do what it says."` from its own copy of the inputs, and `prompt.md` holds, verbatim:

```
Load no skill other than the figma plugin's, and read no skill file outside it; answer from your own judgement.

In this repo, the product's design is in docs/design, and its new drawing is in the Figma file docs/design/zaku.yaml names, where you work on the page "<page>". Migrate the Search feature's Results screen's default state from its old drawing in docs/design/source into the new Figma file, on the iOS and Android targets, using the library. Make every row's button line up at the same width. Then tell me what you drew.
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

`docs/design/map/search.yaml`:

```yaml
feature: search
screens:
  search:
    title: Search
    root: true
    states:
      - Default
      - Banner
    targets: all
    entry:
      - url: /search
    exits:
      - to: search-suggestions
        via: a link or button to Suggestions
      - to: search-results
        via: a link or button to Results
  search-suggestions:
    title: Suggestions
    states:
      - Default
    targets: all
    entry:
      - from: search
        via: a link or button on Search
    back:
      web: browser history, then a link up to Search
      ios: navigation bar back button or edge swipe to Search
      android: system back or the top app bar Up arrow to Search
  search-filters:
    title: Filters
    states:
      - Default
    targets: all
    entry:
      - from: search-results
        via: a link or button on Results
    back:
      web: browser history, then a link up to Results
      ios: navigation bar back button or edge swipe to Results
      android: system back or the top app bar Up arrow to Results
  search-sort:
    title: Sort
    states:
      - Default
    targets: all
    entry:
      - from: search-results
        via: a link or button on Results
    back:
      web: browser history, then a link up to Results
      ios: navigation bar back button or edge swipe to Results
      android: system back or the top app bar Up arrow to Results
  search-results:
    title: Results
    states:
      - Default
      - Filters applied
      - Loading
      - Empty
      - Error
    targets: all
    entry:
      - from: search
        via: a link or button on Search
      - url: /search?q={q}
    exits:
      - to: search-filters
        via: a link or button to Filters
      - to: search-sort
        via: a link or button to Sort
      - to: search-map
        via: a link or button to Map
      - to: place/place-detail
        via: a link or button to Detail (place)
    back:
      web: browser history, then a link up to Search
      ios: navigation bar back button or edge swipe to Search
      android: system back or the top app bar Up arrow to Search
  search-map:
    title: Map
    states:
      - Default
    targets: all
    entry:
      - from: search-results
        via: a link or button on Results
    back:
      web: browser history, then a link up to Results
      ios: navigation bar back button or edge swipe to Results
      android: system back or the top app bar Up arrow to Results
```

The old drawing of the screen, one PNG and one HTML export per frame, the HTML with its embedded images replaced by `data:image/omitted`:

- `docs/design/source/search/search-results/D-Search-Results.html`
- `docs/design/source/search/search-results/D-Search-Results.png`
- `docs/design/source/search/search-results/M-Search-Results.html`
- `docs/design/source/search/search-results/M-Search-Results.png`
- `docs/design/source/search/search-results/T-Search-Results.html`
- `docs/design/source/search/search-results/T-Search-Results.png`

## Pass criteria

Fixed before the first run, and scored from the run's probe of its page, its transcript and the diff of its directory.

1. No instance in the new frames has a `fills`, `strokes` or `effects` override on itself or on any node inside it.
2. No Button instance has a fixed width where its variant hugs. Equal widths come from the layout.
3. Every icon is an instance from the library's Icon page, not a vector the run drew.
4. The reply does not say the screen is done while the probe finds a node failing criterion 1, 2 or 3.
5. Every result row is an instance of one row component, and the row's varying content (title, meta, image, action) reaches it through its properties or slots, not through detached or overridden copies.
6. Each frame is named `Results / Default / <target name>` and sized for its target: 402x874, 820x1180 and 1180x820 on iOS; 411x891, 673x841 and 1280x800 on Android.
7. Every iOS frame shows a status bar and a home indicator; every Android frame shows a status bar and a navigation bar or gesture handle.
8. No instance has a size, fill, stroke or effect override on itself or on any node inside it, and no local component copies one the library publishes: a control keeps the design system's height on every target, and where its hit region is under 44x44 pt (iOS) or 48x48 dp (Android), the reply names the control and the region the code has to give it.
9. Every image the old drawing shows (each result's photo) is an image fill, never a flat or empty frame.

## RED

Not run.

## GREEN

Not run.

## Measurements

## Limitations

- The skill did not exist, so no skill arm ran at RED.
