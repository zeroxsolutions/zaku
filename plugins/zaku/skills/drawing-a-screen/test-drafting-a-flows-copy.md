# Test: drafting the copy of a flow no file holds copy for

## Prompt

Each run is `claude -p --model claude-opus-5-5 --tools "Read,Grep,Glob" --setting-sources project --disable-slash-commands --strict-mcp-config --no-session-persistence`, with `ENABLE_CLAUDEAI_MCP_SERVERS=false`, from its own fresh copy of the inputs in a scratch directory, the prompt on standard input. No run can reach Figma or a shell. The product's name, its Figma file keys, its preset code and every scratch path are replaced with placeholders.

The control arm's prompt is the line below, a blank line, then the task:

```
Load no skill, and read no skill file; answer from your own judgement.
```

The skill arm's prompt is the way the harness hands a loaded skill: `Base directory for this skill: <skill dir>`, a blank line, the body of `SKILL.md` without its frontmatter, a blank line, `Load no other skill.`, a blank line, then the task. `<skill dir>` holds only `SKILL.md` and `references/`, copied from the version under test, so a run cannot read this file. RED hands the body as it stood before the copy section; GREEN hands the changed body.

The task, verbatim:

```
In this directory, the product's design is in docs/design. The product helps tourists plan a trip to Vietnam: they find places, save them, and put them on the days of a trip. I am about to draw the Onboarding feature's screens in Figma, for every target zaku.yaml names. You cannot reach Figma here, so answer as text. For each Onboarding screen, give me every text layer it holds with its copy (heading, body, button and link labels), in every language the product is written in. Write it so I can paste it into the file and report the screens done.
```

## Inputs

`docs/design/zaku.yaml`, `docs/design/README.md` and `docs/design/data/place.json` as in `test-writing-a-screens-copy.md`, and `docs/design/map/onboarding.yaml`:

```yaml
feature: onboarding
screens:
  onboard-1-name:
    title: Onboard 1 - Name
    states:
      - Default
    targets: all
    entry:
      - from: auth/auth-verify-email
        via: a link or button on Verify email (auth)
    exits:
      - to: onboard-2-traveller
        via: a link or button to Onboard 2 - Traveller
    back:
      web: browser history, then a link up to Verify email (auth)
      ios: navigation bar back button or edge swipe to Verify email (auth)
      android: system back or the top app bar Up arrow to Verify email (auth)
  onboard-2-traveller:
    title: Onboard 2 - Traveller
    states:
      - Default
    targets: all
    entry:
      - from: onboard-1-name
        via: a link or button on Onboard 1 - Name
    exits:
      - to: onboard-3-interests
        via: a link or button to Onboard 3 - Interests
    back:
      web: browser history, then a link up to Onboard 1 - Name
      ios: navigation bar back button or edge swipe to Onboard 1 - Name
      android: system back or the top app bar Up arrow to Onboard 1 - Name
  onboard-3-interests:
    title: Onboard 3 - Interests
    states:
      - Default
    targets: all
    entry:
      - from: onboard-2-traveller
        via: a link or button on Onboard 2 - Traveller
    exits:
      - to: onboard-4-region
        via: a link or button to Onboard 4 - Region
    back:
      web: browser history, then a link up to Onboard 2 - Traveller
      ios: navigation bar back button or edge swipe to Onboard 2 - Traveller
      android: system back or the top app bar Up arrow to Onboard 2 - Traveller
  onboard-4-region:
    title: Onboard 4 - Region
    states:
      - Default
    targets: all
    entry:
      - from: onboard-3-interests
        via: a link or button on Onboard 3 - Interests
    exits:
      - to: onboard-5-permissions
        via: a link or button to Onboard 5 - Permissions
    back:
      web: browser history, then a link up to Onboard 3 - Interests
      ios: navigation bar back button or edge swipe to Onboard 3 - Interests
      android: system back or the top app bar Up arrow to Onboard 3 - Interests
  onboard-5-permissions:
    title: Onboard 5 - Permissions
    states:
      - Default
    targets: all
    entry:
      - from: onboard-4-region
        via: a link or button on Onboard 4 - Region
    exits:
      - to: onboard-6-ready
        via: a link or button to Onboard 6 - Ready
    back:
      web: browser history, then a link up to Onboard 4 - Region
      ios: navigation bar back button or edge swipe to Onboard 4 - Region
      android: system back or the top app bar Up arrow to Onboard 4 - Region
  onboard-6-ready:
    title: Onboard 6 - Ready
    states:
      - Default
    targets: all
    entry:
      - from: onboard-5-permissions
        via: a link or button on Onboard 5 - Permissions
    back:
      web: browser history, then a link up to Onboard 5 - Permissions
      ios: navigation bar back button or edge swipe to Onboard 5 - Permissions
      android: system back or the top app bar Up arrow to Onboard 5 - Permissions
```

## Pass criteria

1. Every copy line holds only printable ASCII, Latin letters and marks, and the VND or USD symbols.
2. No copy line holds a phrase of the English tell list, as `test-writing-a-screens-copy.md` lists it.
3. The Vietnamese copy keeps its diacritics.
4. Before calling the copy ready, the reply says each line was checked for its characters and for its tells.

## RED

Control arm, three runs. Each one drafted the copy for all six screens in both languages.

- Criterion 1 passed in runs 1 and 2. In run 3, each option row of Traveller, Interests and Region was written as one line joined by middle dots (U+00B7), for example `Solo`, a middle dot, `Couple`. Whether that row is one layer or a label per chip is not clear from the reply, so it is scored as not shown either way.
- Criteria 2 and 3 passed in all three.
- Criterion 4 failed in all three.

Skill arm, the body as it stood, three runs.

- Run 1 wrote no copy at all. Its reason: "If I wrote the headings and labels myself, I'd be inventing product copy". It went on: "The skill treats copy with no source as a defect, so text pasted from me would look real without being real." Runs 2 and 3 drafted the copy. Run 2 first said "I can't give you copy that's ready to paste".
- Criterion 1: runs 2 and 3 joined the option rows with middle dots, like control run 3.
- Criteria 2 and 3 passed in the two runs that wrote copy.
- Criterion 4 failed in all three.

## GREEN

Skill arm, the changed body, three runs. All three drafted every line, marked it proposed, and passed criteria 1 to 3.

- Criterion 1: the option rows are one row per option, and no middle dot appears.
- Criterion 4 passed in all three. Run 2: "Every line is either printable ASCII or Vietnamese letters with their diacritics. There are no curly quotes, dashes, ellipses, bullets or emoji". Run 3 named `zaku check` and said it must report "no `characters` or `tone` finding". None said in words that it had read the lines for tells.

## Measurements

- Model `claude-opus-5-5`, three runs per arm, RED and GREEN.
- Runs that wrote no copy: RED control 0 of 3, RED skill 1 of 3, GREEN 0 of 3.
- Runs that wrote a phrase of the tell list: 0 of 9.

## Limitations

- The flow is onboarding, the place where a product's copy is most likely to reach for marketing words. No run wrote one, so this scenario gives the tell list no evidence either way.
