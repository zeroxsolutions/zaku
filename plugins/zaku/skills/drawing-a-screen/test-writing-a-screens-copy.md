# Test: writing the copy of a screen whose record holds typographic characters

## Prompt

Each run is `claude -p --model claude-opus-5-5 --tools "Read,Grep,Glob" --setting-sources project --disable-slash-commands --strict-mcp-config --no-session-persistence`, with `ENABLE_CLAUDEAI_MCP_SERVERS=false`, from its own fresh copy of the inputs in a scratch directory, the prompt on standard input. No run can reach Figma or a shell. The product's name, its Figma file keys, its preset code and every scratch path are replaced with placeholders.

The control arm's prompt is the line below, a blank line, then the task:

```
Load no skill, and read no skill file; answer from your own judgement.
```

The skill arm's prompt is the way the harness hands a loaded skill: `Base directory for this skill: <skill dir>`, a blank line, the body of `SKILL.md` without its frontmatter, a blank line, `Load no other skill.`, a blank line, then the task. `<skill dir>` holds only `SKILL.md` and `references/`, copied from the version under test, so a run cannot read this file. RED hands the body as it stood before the copy section; GREEN hands the changed body.

The task, verbatim:

```
In this directory, the product's design is in docs/design. I am about to draw the Place feature's Detail screen, states Default and Error, in Figma, for every target zaku.yaml names. You cannot reach Figma here, so answer as text. Give me the list of frames you would draw, and for each frame every text layer it holds with its copy, in every language the product is written in. The place it shows is docs/design/data/place.json. Write it so I can paste it into the file and report the screen done.
```

## Inputs

`docs/design/zaku.yaml`:

```yaml
product: <product>
designSystem: { shadcn: { preset: <preset> } }
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
copy:
  locales: [en, vi]
  currencies: [VND, USD]
```

`docs/design/README.md`:

```md
This product's design. `zaku.yaml` names the targets every screen is drawn for, the Figma files, and
the languages and currencies its copy is written in. Each `map/<feature>.yaml` lists a feature's
screens, their states, the targets they are drawn for, how a person arrives (`entry`), leaves (`exits`)
and goes back (`back`, per platform family). `data/` holds the records a screen shows. A frame in Figma
is named `<screen title> / <state> / <target name>`.
```

`docs/design/map/place.yaml`:

```yaml
feature: place
screens:
  place-detail:
    title: Detail
    states:
      - Default
      - Loading
      - Error
      - Signed out
    targets: all
    entry:
      - from: search/search-results
        via: a link or button on Results (search)
      - url: /places/{placeId}
    exits:
      - to: place-reviews
        via: a link or button to Reviews
      - to: place-q-and-a
        via: a link or button to Q and A
      - to: place-chat
        via: a link or button to Chat
    back:
      web: browser history, then a link up to Results (search)
      ios: navigation bar back button or edge swipe to Results (search)
      android: system back or the top app bar Up arrow to Results (search)
  place-reviews:
    title: Reviews
    states:
      - Default
    targets: all
    entry:
      - from: place-detail
        via: a link or button on Detail
    back:
      web: browser history, then a link up to Detail
      ios: navigation bar back button or edge swipe to Detail
      android: system back or the top app bar Up arrow to Detail
  place-q-and-a:
    title: Q and A
    states:
      - Default
    targets: all
    entry:
      - from: place-detail
        via: a link or button on Detail
    back:
      web: browser history, then a link up to Detail
      ios: navigation bar back button or edge swipe to Detail
      android: system back or the top app bar Up arrow to Detail
  place-chat:
    title: Chat
    states:
      - Default
    targets: all
    entry:
      - from: place-detail
        via: a link or button on Detail
    back:
      web: browser history, then a link up to Detail
      ios: navigation bar back button or edge swipe to Detail
      android: system back or the top app bar Up arrow to Detail
```

`docs/design/data/place.json`, its non-ASCII characters written here as JSON escapes; the run's copy held them as characters. The English summary holds an em dash (U+2014) and a curly apostrophe (U+2019), as a catalogue record pasted from elsewhere does:

```json
{
  "id": "0199a1f4-4000-7000-8000-000000000001",
  "name": {
    "en": "Hoi An Ancient Town",
    "vi": "Ph\u1ed1 c\u1ed5 H\u1ed9i An"
  },
  "region": {
    "en": "Quang Nam",
    "vi": "Qu\u1ea3ng Nam"
  },
  "summary": {
    "en": "A trading port from the 15th to the 19th century \u2014 the town\u2019s 1,100 timber houses still stand.",
    "vi": "Th\u01b0\u01a1ng c\u1ea3ng t\u1eeb th\u1ebf k\u1ef7 15 \u0111\u1ebfn th\u1ebf k\u1ef7 19, c\u00f2n gi\u1eef 1.100 ng\u00f4i nh\u00e0 g\u1ed7."
  },
  "openingHours": "07:00-21:30",
  "ticket": {
    "amount": 120000,
    "currency": "VND",
    "note": "foreign visitors; covers five sites"
  },
  "rating": 4.7,
  "reviewCount": 2140,
  "questionCount": 86,
  "chatOnline": 12,
  "savedCount": 5320
}
```

The run's directory also held `docs/design/map/search.yaml`, which the map's entries name.

## Pass criteria

1. Every copy line holds only printable ASCII, Latin letters and marks, and the VND or USD symbols: no em or en dash, curly quote, ellipsis character, middle dot, bullet, arrow, multiplication sign, non-breaking or zero-width space, or emoji.
2. No copy line holds a phrase of the English tell list: delve, seamless, elevate, unlock, unleash, empower, effortless, leverage, utilize, supercharge, game-changer, cutting-edge, robust, tapestry, testament, vibrant, let's, it's important to note, in order to, whether you're, not just X but Y.
3. The Vietnamese copy keeps its diacritics.
4. The ticket line shows the data's amount, 120000, with its currency.
5. The Error state's copy names what failed and carries an action label that recovers from it.
6. No action label is generic: Click here, Learn more, Submit, OK, Go.
7. One state's copy is the same across its targets, or the reply names why a target differs.
8. The frame list names 18 frames as `Detail / <state> / <target name>`.
9. Before calling the copy ready, the reply says each line was checked for its characters and for its tells.

## RED

Control arm, three runs. Criteria 2 to 8 passed in all three. Every run declined to call the screen done, because the map names four states.

- Criterion 1 failed in all three. Each run pasted the record's English summary as it was, with the em dash and the curly apostrophe. Run 1 also wrote the opening hours with an en dash (U+2013) instead of the record's hyphen, the rating line as `4.7`, a middle dot (U+00B7), then `2,140 reviews`, and the web back link as a leftwards arrow (U+2190) followed by `Results`. Run 2 wrote the error title with a curly apostrophe (`Couldn` U+2019 `t load this place`). Run 3 joined `Chat`, a middle dot and `12 online`. Run 2 gave the reason for its dash: "The `-` in opening hours became an en dash".
- Criterion 9 failed in all three. No run said it had checked a line's characters or its wording.

Skill arm, the body as it stood, three runs. Criteria 2, 3, 4, 6, 7 and 8 passed in all three.

- Criterion 1 failed in all three. The summary went in with its em dash and curly apostrophe in each run. Run 1 wrote the hours as `7:00 AM`, an en dash, `9:30 PM` and the error title with a curly apostrophe. Run 2 wrote an en dash in the hours and a middle dot in the Chat line. Run 3 wrote an en dash in the hours, a middle dot in the Chat line and a curly apostrophe in the error title.
- Criterion 5 failed in run 2. It left the error title, body and retry label empty. Its reason: "Text I make up would be placeholder copy, which counts as a defect." It added: "Drawing them with stand-in text would fail the screen." The body's "Real copy" line, which calls placeholder copy a defect, was read as a ban on drafting copy that no file holds.
- Criterion 9 failed in all three.

## GREEN

Skill arm, the changed body, three runs. Criteria 1 to 8 passed in all three.

- Criterion 1: every run rewrote the English summary as two sentences with a straight apostrophe, wrote the hours `07:00-21:30`, and joined counts with parentheses or `-`. Run 1: "It had an em dash (`century - the`), which is now two sentences, and a curly apostrophe (`town's`), which is now `'`." That quote is the run's own words, with its glyphs written here in ASCII.
- Criterion 5: all three drafted the error copy and marked it proposed. Run 2: "Everything marked proposed above, including the vi ticket note, needs approval from your copy owner before it counts as final."
- Criterion 9 passed in run 2, which said "The vi summary and every other line are already within the rule". Runs 1 and 3 named the rewrite of the summary and left the remaining lines to `zaku check`'s `characters` and `tone` findings. Run 1: "You can report Default and Error as drawn only when there are no `characters` or `tone` findings." Neither said line by line that the other lines were read.

## Measurements

- Model `claude-opus-5-5`, three runs per arm, RED and GREEN.
- Copy lines holding a character outside criterion 1: RED control 3 of 3 runs, RED skill 3 of 3, GREEN 0 of 3.
- Runs that wrote a phrase of the tell list: 0 of 9.

## Limitations

- No run could draw, so `zaku check` never read a frame. The criteria score the copy a run would place.
- No run wrote a tell in either arm, so the tell list is tested only by the checker's specs. The body carries no tell list, because no run gave it a failure to answer.
- Three skill-arm runs, two RED and one GREEN, could not open `references/figma.md`, because the harness refused the read. The copy section names no layer's spelling, so the scores do not depend on it.
