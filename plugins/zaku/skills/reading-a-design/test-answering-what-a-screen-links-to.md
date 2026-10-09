# Test: answering what a screen links to

## Prompt

The control arm is the only arm: the skill did not exist. The run is `claude -p "Read prompt.md in this directory and do what it says."` from its own copy of the inputs, and `prompt.md` holds, verbatim:

```
Load no skill other than the figma plugin's, and read no skill file outside it; answer from your own judgement.

In this repo, the product's design is in docs/design, and its new drawing is in the Figma file docs/design/zaku.yaml names, where you work on the page "<page>". Where can a person go from the Trips feature's Itinerary screen, and how do they get back from it on Android? Answer only; change nothing.
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

`docs/design/map/trips.yaml`:

```yaml
feature: trips
screens:
  trips:
    title: Trips
    root: true
    states:
      - Default
      - Loading
      - Empty
      - Error
    targets: all
    entry:
      - url: /trips
    exits:
      - to: trip-new
        via: a link or button to New
      - to: trip-itinerary
        via: a link or button to Itinerary
  trip-new:
    title: New
    states:
      - Default
      - Loading
    targets: all
    entry:
      - from: trips
        via: a link or button on Trips
      - url: /trips/new
    back:
      web: browser history, then a link up to Trips
      ios: navigation bar back button or edge swipe to Trips
      android: system back or the top app bar Up arrow to Trips
  trip-itinerary:
    title: Itinerary
    states:
      - Default
      - Cancel dialog
      - Cancel dialog, pending
      - Cancel dialog, refused
      - Cancelled
      - First run
      - First run, step 1
      - First run, step 2
      - First run, step 3
      - Trip menu
      - Loading
      - Error
    targets: all
    entry:
      - from: trips
        via: a link or button on Trips
      - url: /trips/{tripId}
    exits:
      - to: trip-today
        via: a link or button to Today
      - to: trip-members
        via: a link or button to Members
      - to: trip-compare
        via: a link or button to Compare
      - to: trip-map
        via: a link or button to Map
      - to: trip-completed
        via: a link or button to Completed
    back:
      web: browser history, then a link up to Trips
      ios: navigation bar back button or edge swipe to Trips
      android: system back or the top app bar Up arrow to Trips
  trip-today:
    title: Today
    states:
      - Default
    targets: all
    entry:
      - from: trip-itinerary
        via: a link or button on Itinerary
    back:
      web: browser history, then a link up to Itinerary
      ios: navigation bar back button or edge swipe to Itinerary
      android: system back or the top app bar Up arrow to Itinerary
  trip-members:
    title: Members
    states:
      - Default
    targets: all
    entry:
      - from: trip-itinerary
        via: a link or button on Itinerary
    back:
      web: browser history, then a link up to Itinerary
      ios: navigation bar back button or edge swipe to Itinerary
      android: system back or the top app bar Up arrow to Itinerary
  trip-compare:
    title: Compare
    states:
      - Default
    targets: all
    entry:
      - from: trip-itinerary
        via: a link or button on Itinerary
    back:
      web: browser history, then a link up to Itinerary
      ios: navigation bar back button or edge swipe to Itinerary
      android: system back or the top app bar Up arrow to Itinerary
  trip-map:
    title: Map
    states:
      - Default
    targets: all
    entry:
      - from: trip-itinerary
        via: a link or button on Itinerary
    back:
      web: browser history, then a link up to Itinerary
      ios: navigation bar back button or edge swipe to Itinerary
      android: system back or the top app bar Up arrow to Itinerary
  trip-completed:
    title: Completed
    states:
      - Default
    targets: all
    entry:
      - from: trip-itinerary
        via: a link or button on Itinerary
    back:
      web: browser history, then a link up to Itinerary
      ios: navigation bar back button or edge swipe to Itinerary
      android: system back or the top app bar Up arrow to Itinerary
```

## Pass criteria

Fixed before the first run, and scored from the run's probe of its page, its transcript and the diff of its directory.

1. The answer names every exit of `trip-itinerary` in its map (Today, Members, Compare, Map, Completed), and its `back.android` (system back or the top app bar Up arrow, to Trips).
2. The run read `docs/design/map/trips.yaml`.
3. The run made at most one Figma call that reads more than one frame. A `get_metadata` or `get_screenshot` on a page, or a `use_figma` that walks one, counts as one.
4. The run made no Figma write call.

## RED

Control arm, three runs, no skill loaded.

| Run       | 1    | 2    | 3    | 4    |
| --------- | ---- | ---- | ---- | ---- |
| control A | PASS | PASS | PASS | PASS |
| control B | PASS | PASS | PASS | PASS |
| control C | PASS | PASS | PASS | PASS |

Every run read the map, answered from it, and named all five exits and the Android way back. Control
C: "the map is where the design records where each screen leads and how to go back." Control A made one
Figma call, a page list; B and C made none.

**Every criterion passed in the control arm, so no rule ships for reading a map on this scenario's
evidence.** What `reading-a-design` says about the read order and the call budget stays a draft until a
scenario fails without it.

## GREEN

Not run.

## Measurements

| Run       | Figma calls | Turns | Cost  | Seconds |
| --------- | ----------- | ----- | ----- | ------- |
| control A | 1           | 6     | $0.21 | 34      |
| control B | 0           | 5     | $0.21 | 15      |
| control C | 0           | 5     | $0.22 | 15      |

## Limitations

- The skill did not exist, so no skill arm ran at RED.
- The run's page was empty, so the scenario never tempted a run to read the drawing instead of the map.
- The harness allowed the shell for these runs; each used it to `cat` the map.
