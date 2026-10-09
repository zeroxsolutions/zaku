# Test: mapping a feature whose states can strand the person, a connection and a pairing code

## Prompt

Each run is `claude -p` with the model `claude-opus-5-5`, from its own `mktemp -d` copy of the inputs,
with only the Read, Grep and Glob tools, slash commands and skills disabled, no MCP server, and
`ENABLE_CLAUDEAI_MCP_SERVERS=false`. The scratch paths were replaced with `<skills dir>`, a directory
holding only the skill's `SKILL.md`: master's at RED, the changed one at GREEN.

The control arm opens with the first fence, the skill arm with the second, and both end with the third.

```
Load no skill, and read no skill file; answer from your own judgement.
```

```
Your harness loaded the skill below for this task through its Skill tool; what follows up to the rule is what that tool injected.

Base directory for this skill: <skills dir>/mapping-a-feature

<the body of SKILL.md, its frontmatter removed>

---

Load no other skill.
```

```
This repo's product design is in docs/design. We are adding the Connect feature. The panel talks to a helper service the person runs on their own computer, which listens on a localhost port (7801 unless the person changed it in the helper's settings). On first use the panel connects to the helper; the helper then shows an 8-digit pairing code in its own window, and the person types that code into the panel to pair. Once paired, the panel opens Home (docs/design/map/home.yaml). Map the feature's screens in docs/design/map/connect.yaml. You cannot write files here, so reply with the full content of every file you would write or change.
```

## Inputs

`docs/design/` also held `zaku.schema.json` and `map.schema.json` as the plugin ships them.

`docs/design/zaku.yaml`:

```yaml
product: <product>
designSystem: { shadcn: { preset: aCm3pr3s7 } }
figma: { library: LIBKEY, product: PRODKEY }
targets:
  - { id: panel, family: web, name: Panel }
```

`docs/design/README.md`:

```md
This product's design. The product is a plugin panel that runs inside a desktop design tool, 320 px wide.
`zaku.yaml` names the targets every screen is drawn for and the Figma files; `zaku.schema.json` and
`map.schema.json` are the JSON Schemas both kinds of file are validated against. Each
`map/<feature>.yaml` lists a feature's screens, their states, the targets they are drawn for, how a
person arrives (`entry`), leaves (`exits`) and goes back (`back`, per platform family), and the library
components they use. A frame in Figma is named `<screen title> / <state> / <target name>`.
```

`docs/design/map/home.yaml`:

```yaml
feature: home
screens:
  home:
    title: Home
    root: true
    states: [Default, Loading, Empty, Error]
    targets: all
    entry:
      - { url: /panel }
    exits: []
    components: [Card, Button]
```

## Pass criteria

Fixed before the first run. Criterion 4 was scored by validating the reply's `connect.yaml` against the
run's `map.schema.json`.

1. Every state the map lists other than Default names, in the map, the control a person uses to leave
   or recover from it (an `exits` or `back` row whose `via` is a control shown in that state, or the
   map text tying that state to its control). One state with none fails the run.
2. The state shown when the panel cannot reach the helper names both a retry and a way to change the
   port the panel tries, reachable from that state.
3. The state shown when the code is wrong or expired names how the person enters a code again or gets
   a new one.
4. `connect.yaml` validates against `docs/design/map.schema.json`.

## RED

Criterion 1 fails in all six runs: every map lists its failure states by name and ties no control to
them. The control arm's `exits` name events where the control belongs.

| Run       | 1    | 2    | 3    | 4    |
| --------- | ---- | ---- | ---- | ---- |
| Control 1 | fail | pass | fail | pass |
| Control 2 | fail | pass | pass | pass |
| Control 3 | fail | fail | fail | fail |
| Skill 1   | fail | pass | fail | pass |
| Skill 2   | fail | pass | fail | pass |
| Skill 3   | fail | pass | fail | pass |

- Control 1: Connect's only exit is `{ to: pair, via: Helper answers on the port }`; the port field and
  the try-again button are in the reply's prose only. Pair: "`Error` covers a code the helper rejects",
  with nothing to do in it.
- Control 2: `exits` via "Helper answered on the port"; "Not found ... shows a port field and a Retry
  button" in prose. Wrong code passes 3 through its `a11y` note, "focus returns to the first slot", and
  "Pair has no lockout or expiry state".
- Control 3: "I put a port field on Connect's `Helper not found` state", with no retry; `Code expired`
  names no way to a new code; an unquoted comma in a flow mapping breaks the schema.
- Skill 1: "Error covers the panel not reaching the helper"; the Port field and Connect button are the
  screen's, with no row tying them to Error. Pair: "Error covers a wrong or expired code", and no way
  to a new code.
- Skill 2: "Error covers a wrong code, and the helper going away while the person is pairing", with
  nothing to act on in either.
- Skill 3: "On Pair, Error means the code was rejected", and nothing more.

## GREEN

All three runs pass every criterion, and every `connect.yaml` validates. Each writes the way out as
`exits` rows to the screen itself, the states in a comment:

```yaml
- { to: connect, via: Port } # Error: the port it failed on, shown editable, 7801 unless changed
- { to: connect, via: Try again } # Error
- { to: pair, via: Get a new code } # Error: asks the helper to show a new code in its window
```

- Run 1: Pair gains Expired and Disconnected, each with its row ("Get a new code", "Reconnect"). It
  also reported "Home has no way out of its errors ... I left it out of this change because it's Home's
  contract, not Connect's."
- Run 2: "If the person changed the port in the helper's settings, trying 7801 again would just fail
  again."
- Run 3: "Error shows the **Pairing code** field editable, plus **Get a new code**, because an expired
  code can't be fixed by typing."

## Measurements

`claude-opus-5-5` through Claude Code 2.1.295; three runs per arm at RED, three skill-arm runs at GREEN.

## Limitations

- A way out that leaves the product (a help page, a contact) has no row: `exits.to` must name a screen.
  GREEN run 2 said so and added none. The rule names it; the schema cannot hold it.
- The map ties a row to a state only through a YAML comment, which the checker does not parse. No
  check reads it; the review holds each state's frame to it.
- The scenario asks for a map, not a drawing, so `reviewing-a-design`'s way out row was not run.
- GREEN's copy of `SKILL.md` had two rows of `## Common Mistakes` run together on one line, an editing
  slip repaired after the runs; no rule's text changed.
