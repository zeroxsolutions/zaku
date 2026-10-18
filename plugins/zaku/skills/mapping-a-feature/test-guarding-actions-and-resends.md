# Test: mapping a feature whose actions cannot be taken back and whose control sends a link

## Prompt

Each run is `claude -p` with the model `claude-opus-5-5`, from its own copy of the inputs, with only
the Read, Grep and Glob tools, the Skill tool disallowed, no MCP server, and
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
This repo's product design is in docs/design. Map two features before anyone draws them.

1. Trip (docs/design/map/trip.yaml): the Trip screen shows a trip's days and places. From its "..." menu the trip's owner can Edit trip, Invite people, open People, or Cancel trip (cancelling ends the trip for every companion). The People screen lists companions; the owner can Remove a companion, and a companion who is not the owner can Leave trip. The account menu, reached from the avatar in the header, has Profile, Language and Sign out.

2. Verify email (docs/design/map/auth.yaml): after a traveller types their email, the Verify email screen says a sign-in link was sent and offers "Open mail app", "Resend the link" and "Wrong address? Change it". Following the link opens Home (docs/design/map/home.yaml).

You cannot write files here, so reply with the full content of every file you would write or change.
```

## Inputs

`docs/design/` also held `zaku.schema.json` and `map.schema.json` as the plugin ships them.

`docs/design/zaku.yaml`:

```yaml
product: <product>
designSystem: { shadcn: { preset: b4N0wYBxw } }
figma: { library: LIBKEY, product: PRODKEY }
targets:
  - { id: web-desktop, family: web, name: Web desktop }
  - { id: web-mobile, family: web, name: Web mobile }
  - { id: ios-phone, family: ios, name: iOS phone }
  - { id: android-phone, family: android, name: Android phone }
```

`docs/design/README.md`:

```md
This product's design. `zaku.yaml` names the targets every screen is drawn for and the Figma files; `zaku.schema.json` and
`map.schema.json` are the JSON Schemas both kinds of file are validated against. `profile.md` describes who uses the product.
Each `map/<feature>.yaml` lists a feature's screens, their states, the targets they are drawn for, how a person arrives (`entry`),
leaves (`exits`) and goes back (`back`, per platform family), and the library components they use. A frame in Figma is named
`<screen title> / <state> / <target name>`.
```

`docs/design/profile.md`:

```md
# Product profile

A trip planner for tourists visiting Vietnam. They plan a trip with friends, then use it on the road.

## Actors

| Actor      | Goals                                                         | Environment                                                                       | Status                          |
| ---------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------- |
| Traveller  | plan days, share the trip with companions, find places nearby | mostly a phone, one hand, outdoors, abroad on roaming or tourist SIM, patchy data | evidence: app analytics 2026-09 |
| Trip owner | invite companions, manage who is on the trip                  | same                                                                              | evidence                        |

## Traits that change a decision

- Signing in uses an emailed sign-in link or an SMS code; there is no password. Abroad, SMS often arrives late or not at all. (evidence: support tickets)
- A trip holds weeks of planning and is shared with up to 12 companions. (evidence)
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
      - { url: / }
    exits: []
    components: [Card, Button]
```

## Pass criteria

Fixed before the first run.

1. Cancel trip, Remove (a companion) and Leave trip each reach a confirmation state, or an undo, named
   in the map before the action takes effect. One of the three missing fails the run.
2. Sign out reaches a confirmation state or an undo named in the map, since the profile says signing
   back in needs an emailed link or an SMS code that abroad often arrives late or not at all.
3. The Verify email screen lists a state in which "Resend the link" is held with the time left, and a
   state for the service refusing the send as rate limited, each with its way out.

## RED

Control arm, three runs:

- Criterion 1 passed in all three: control 1 gave Cancel trip, Remove and Leave trip each "a confirm
  dialog with its own screen"; control 2 "a confirmation dialog"; control 3 the states `Confirm
  cancel`, `Confirm remove`, `Confirm leave`.
- Criterion 2 failed in all three: each wired `{ to: auth/sign-in, via: Sign out }` straight from the
  account menu.
- Criterion 3 failed in all three. Control 1 listed `Resend cooldown` but no rate-limited state, its
  refusal folded into `Error`; control 2 listed `[Default, Resending, Resent, Offline, Error]`;
  control 3 described a cooldown in prose ("disabled for a short cooldown after each send") with no
  state, and no rate-limited state.

Skill arm (master's `SKILL.md`), three runs:

- Criterion 1 passed in all three ("Cancel trip, Leave trip and Remove companion are confirmation
  screens, because each one can't be undone or affects other people").
- Criterion 2 failed in all three: `{ to: auth/sign-in, via: Sign out }` from the menu.
- Criterion 3 failed in all three: Verify email held `[Default, Error, Link expired]` or `[Default,
  Error, Sent again, Link expired]`, with `Resend the link` an exit back to the screen and no hold.

## GREEN

The changed `SKILL.md`, three runs:

- Criterion 1 passed in all three: `Confirm cancel trip`, `Confirm remove companion`, `Confirm leave
  trip`, each with its cancel control ("Keep trip", "Cancel", "Stay on trip") as the way out.
- Criterion 2 passed in all three: `Confirm sign out`, its primary control "Sign out" and its cancel
  control "Stay signed in" or "Cancel"; green 2's comment: "getting back in needs a new sign-in link or
  SMS code, and abroad an SMS may come late or not at all".
- Criterion 3 passed in all three: Verify email `[Default, Error, Resend cooldown, Rate limited]` (green
  3 adds `Link expired`), Rate limited's way out "Wrong address? Change it" or Open mail app. Two runs
  also gave Send invite and Send sign-in link the same two states.

## Measurements

Model `claude-opus-5-5`, three runs per arm at RED and three at GREEN. Criterion 1: 6/6 at RED, 3/3 at
GREEN. Criterion 2: 0/6 at RED, 3/3 at GREEN. Criterion 3: 0/6 at RED, 3/3 at GREEN.

## Limitations

- Criterion 1 already passed with no guidance; the rule ships for criteria 2 and 3 and for the
  recorded session below, and states the predicate the confirmation in criterion 1 rests on.
- The undo branch of the rule (a state named for what happened, showing the undo control) had no
  action in the scenario that the product can reverse, so no run exercised it.
- Two GREEN runs added `Confirm discard changes` to an edit form the prompt did not describe as
  holding unsaved work; no criterion scored it.
- The profile here has no offline copies, so the sign-out clause about what the device keeps was not
  exercised; its source is the decision record named in the log.
