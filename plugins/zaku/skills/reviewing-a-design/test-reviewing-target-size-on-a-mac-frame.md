# Test: reviewing target size on a macOS frame the checker could not measure

## Prompt

Each run is `claude -p` with the model `claude-opus-5-5`, from its own `mktemp -d` copy of the inputs,
with only the Read, Grep, Glob, WebFetch and WebSearch tools, slash commands and skills disabled, no MCP
server, and `ENABLE_CLAUDEAI_MCP_SERVERS=false`. The scratch paths were replaced with `<skills>`.

The control arm, verbatim:

```
Load no skill, and read no skill file; answer from your own judgement.

This repo's product design is in docs/design. A drawing of the Settings feature's Notifications screen for the native macOS app is about to be reported done, and you are its reviewer. `zaku check` could not measure target size (its output is docs/design/check.txt), so decide that criterion yourself from docs/design/outline/settings/notifications.yaml, which lists every control on the frame with its bounds. Report the target size result, each control that fails it, and the rule you applied with its source.
```

The skill arm, verbatim, `<skills>` holding the skill as it stood on master at RED and the changed
copy at GREEN:

```
Read `<skills>/reviewing-a-design/SKILL.md` before you start, and follow them. Where those files and an installed skill of the same name disagree, those files win.

This repo's product design is in docs/design. A drawing of the Settings feature's Notifications screen for the native macOS app is about to be reported done, and you are its reviewer. `zaku check` could not measure target size (its output is docs/design/check.txt), so decide that criterion yourself from docs/design/outline/settings/notifications.yaml, which lists every control on the frame with its bounds. Report the target size result, each control that fails it, and the rule you applied with its source.
```

## Inputs

Each run's `docs/design/` also held the plugin's `zaku.schema.json` and `map.schema.json`: master's at
RED, the changed ones at GREEN.

`docs/design/zaku.yaml`:

```yaml
product: <product>
designSystem: { shadcn: { preset: aCm3pr3s7 } }
figma: { library: LIBKEY, product: PRODKEY }
targets:
  - { id: web-desktop, family: web, name: Desktop }
  - { id: ios-phone, family: ios, name: iPhone }
  - { id: mac, family: macos, name: Mac }
```

`docs/design/check.txt`:

```
$ zaku check --feature settings
coverage      pass
way-back      pass
library       pass
overrides     pass
target-size   NOT RUN  library.json is missing
overlap       pass
copy          pass
system-bars   pass
exit 2
```

`docs/design/outline/settings/notifications.yaml`:

```yaml
feature: settings
screen: notifications
frames:
  - name: Notifications / Default / Mac
    target: mac
    size: { width: 1440, height: 900 }
    controls:
      - {
          nodeId: '41:2',
          layer: Back,
          component: Button,
          variant: 'variant=ghost, size=icon',
          bounds: { x: 84, y: 14, width: 28, height: 28 },
        }
      - {
          nodeId: '41:7',
          layer: Mute all,
          component: Button,
          variant: 'variant=ghost, size=icon-sm',
          bounds: { x: 1360, y: 96, width: 24, height: 24 },
        }
      - {
          nodeId: '41:9',
          layer: Send a test,
          component: Button,
          variant: 'variant=outline, size=default',
          bounds: { x: 1248, y: 812, width: 96, height: 32 },
        }
```

## Pass criteria

Fixed before the first run.

1. Applies macOS's own size, Apple HIG Accessibility's 28x28 pt default control size: fails `Mute all`
   (24x24) and passes `Back` (28x28) and `Send a test` (96x32).
2. Names Apple's HIG as the source of the macOS number, not iOS's 44x44 pt, the web's 24x24 px or
   Material's 48x48 dp.

## RED

Control: criterion 1 fails in all three, criterion 2 passes in all three. Each read the HIG table and
took its 20x20 pt minimum as the line, passing every control: "A control fails only if it is under the
minimum. Being under the default is a warning, not a fail." (run 1); "I failed only controls below the
minimum." (run 2); "the pass/fail floor is 20x20 pt" (run 3).

Skill: both criteria pass in all three, by analogy with the iOS row, and each run said the skill gave
no macOS size: "The skill's target-size criterion only gives thresholds for iOS, Android and web, not
macOS." (run 2); "So I applied the skill's rule to macOS myself" (run 1); "If you judge against Apple's
20x20 minimum instead, all three controls pass." (run 3). Each left the choice to a person.

## GREEN

Both criteria pass in all three, and each reads the number off the row: "That number comes from the
target-size row of `reviewing-a-design`." (run 1); "as quoted in the `reviewing-a-design` skill's
criteria table" (run 2); "Source: `reviewing-a-design` SKILL.md, criteria table, "target size" row."
(run 3). None offered the 20x20 pt minimum as an alternative reading.

## Measurements

`claude-opus-5-5`; three runs per arm at RED, three skill-arm runs at GREEN. The first RED batch printed
nothing on three of these six runs; those three were run again with JSON output and stdin closed.

## Limitations

- Only macOS was run; the Windows, GNOME and KDE numbers rest on the sources the log names.
- The system bars row changed with no run of its own.
