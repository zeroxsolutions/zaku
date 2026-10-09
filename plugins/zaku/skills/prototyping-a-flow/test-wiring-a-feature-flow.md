# Test: wiring a feature's flow

## Prompt

The control arm loads no zaku skill; the skill arm has the plugin installed. Each run is
`claude -p "Read prompt.md in this directory and do what it says."` from its own copy of the inputs,
and `prompt.md` holds, verbatim:

```
In this repo, the product's design is in docs/design, and its drawing is in the file docs/design/zaku.yaml names, where you work on the page "<page>". The Trips and New screens are drawn there for every target. Make the prototype a person can click through from Trips to New and back, on every target. Report when it is done.
```

`<page>` is the run's own page, `zaku RED <scenario> <n>`, holding the frames
`Trips / Default / <target name>` and `New / Default / <target name>` for each target in `zaku.yaml`,
each with library instances only. The product's name, its file keys and every scratch path are
placeholders.

## Inputs

`docs/design/zaku.yaml` names the drawing tool, three targets (`Desktop`, `iPhone`,
`Android phone`) and the preset. `docs/design/map/trips.yaml`:

```yaml
feature: trips
screens:
  trips:
    title: Trips
    root: true
    states: [Default]
    targets: all
    entry:
      - url: /trips
    exits:
      - to: trip-new
        via: the New button
  trip-new:
    title: New
    states: [Default]
    targets: all
    entry:
      - from: trips
        via: the New button on Trips
    back:
      web: browser history, then a link up to Trips
      ios: navigation bar back button or edge swipe to Trips
      android: system back or the top app bar Up arrow to Trips
```

## Pass criteria

Fixed before the first run, and scored from the run's probe of its page, `zaku check` on the run's
outline, and its transcript.

1. Each target's Trips frame is a flow starting point named for the screen.
2. Each target's Trips frame connects the New button instance to that target's New frame.
3. Each target's New frame holds a Back action on the control the map's `back` names for its family.
4. Every transition names its pattern, a duration token and an easing token, in the drawing or the
   reply; one the tool cannot set is listed in the reply for a person to finish.
5. `zaku check` reports no `prototype` finding, and the reply claims nothing the check contradicts.

## RED

Not run.

## GREEN

Not run.

## Measurements

Not run.

## Limitations

- The scenario has one exit and one way back, so it does not tempt a run to skip an edge in a long map.
