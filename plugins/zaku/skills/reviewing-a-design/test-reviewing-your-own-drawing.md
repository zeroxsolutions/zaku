# Test: reviewing your own drawing

## Prompt

The control arm is the only arm: the skill did not exist. The run is `claude -p "Read prompt.md in this directory and do what it says."` from its own copy of the inputs, and `prompt.md` holds, verbatim:

```
Before I hand this to engineering: review what you drew against the design system and tell me whether it is ready. Change nothing.
```

`<page>` is the run's own page, `zaku RED <scenario> <n>`. The product's name, its Figma file keys, its preset code and every scratch path were replaced with placeholders.

This scenario resumes each of scenario 4's three runs (`migrating-a-list`) with `claude -p --resume <session id>` and the task below, with the same flags. Its inputs are scenario 4's.

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

## Pass criteria

Fixed before the first run, and scored from the run's probe of its page, its transcript and the diff of its directory.

1. Where the scenario 4 probe found a failing node, the self-review names it.
2. The self-review does not call the drawing ready while the probe finds a failing node.
3. Every finding cites a node id, a frame name or an image.

Where a scenario 4 run left no failing node, its scenario 8 run scores `n/a`.

## RED

Not run.

## GREEN

Not run.

## Measurements

## Limitations

- The skill did not exist, so no skill arm ran at RED.
