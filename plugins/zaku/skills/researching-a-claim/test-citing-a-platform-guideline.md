# Test: citing a platform guideline in a spec

## Prompt

Every run is `claude -p "<prompt>"` from its own empty scratch directory, with
`ENABLE_CLAUDEAI_MCP_SERVERS=false`, `--model claude-opus-5-5`, and the tools Read, Grep, Glob, WebFetch
and WebSearch. The control arm's prompt is the first fence followed by the task. The skill arm's
prompt is the second fence, the way the harness delivers a loaded skill: `<skill copy>` stands for the
absolute path of a scratch copy holding only `SKILL.md` and `finding-the-law-in-force-on-a-date.md`, so
no run could read the criteria, and `<body>` for that `SKILL.md` without its frontmatter. Scratch paths
were replaced with these placeholders.

```
Load no skill and write no file: everything the task needs is below, and your answer is your reply.
```

```
Base directory for this skill: <skill copy>

<body>

Load no other skill and write no file: everything else the task needs is below, and your answer is your reply.
```

The task, the same in both arms:

```
Our app's icon buttons ship on iOS, Android and the web. Write the one line for our design spec that sets their minimum touch target size as a hard requirement, and give the platform rules it rests on, with your sources.
```

## Inputs

None. The prompt carries the whole task.

## Pass criteria

Fixed before the runs. Each is scored on the run's final answer.

1. Every factual claim carries a source (a URL, or a document and its section) or the label
   "(unverified)". One claim stated as fact with neither fails the run.
2. Every guideline cited carries its version or date: the page's change-log or update date, or the
   standard's dated version.
3. The answer records each source's normative strength in that document's own terms (a requirement,
   a recommendation, or informative text) and does not present a vendor's recommendation as a hard
   requirement without saying so.
4. The answer reaches the primary source for each platform (the vendor's or the standards body's own
   page or the data behind it), or, where one fails, names the routes it tried; it never presents a
   secondary site as the primary text.

## RED

The skill arm is `Not run`: the skill did not exist before this change.

| Run       | 1 source or (unverified) | 2 version or date | 3 strength in the source's terms | 4 primary or routes named |
| --------- | ------------------------ | ----------------- | -------------------------------- | ------------------------- |
| control 1 | pass                     | fail              | fail                             | pass                      |
| control 2 | pass                     | fail              | pass                             | pass                      |
| control 3 | fail                     | fail              | fail                             | fail                      |

- control 1, criterion 3: a table headed "What each platform requires" lists Apple's "Recommended
  (default) size" as what iOS requires, and the spec line says MUST; criterion 2: no guideline carries a
  date.
- control 2, criterion 3: "Apple and Google only recommend those sizes ... Making these sizes a 'MUST'
  is our own decision"; criterion 2: no date or version for the Apple or Android page.
- control 3, criterion 1: "Level AA's 24 px is the legal/compliance floor", with no source; criterion 4:
  the iOS and WCAG figures come from summary sites, and the W3C page is listed "For the normative WCAG
  text" without having been opened.

## GREEN

| Run     | 1    | 2    | 3    | 4    |
| ------- | ---- | ---- | ---- | ---- |
| green 1 | pass | pass | pass | pass |
| green 2 | pass | pass | pass | pass |
| green 3 | pass | pass | pass | pass |

Every run read Apple's guideline from the data the page loads and dated it by its change log, dated
Android's page by its "Last updated" line and WCAG by its Recommendation date, and named the team as
the source of the hard requirement.

- green 1, criterion 3: "None of the three platform sources sets these numbers as a hard rule".
- green 2, criterion 2: "Latest change-log entry June 9, 2025" for Apple and "Last updated 2026-09-22
  UTC" for Android.
- green 3, criterion 4: "the Apple HIG page only renders in a browser, so I read its JSON data route
  instead, which worked."

## Measurements

- Model: `claude-opus-5-5` through `claude -p`, one fresh process per run.
- Runs: control 3; GREEN 3. GREEN ran the round 1 body.
- Criteria 1 / 2 / 3 / 4 passed:
  - RED control: 2 / 0 / 1 / 2
  - GREEN: 3 / 3 / 3 / 3
- Tool calls: control 6, 6, 4; GREEN 4, 5, 4.

## Limitations

- The skill arm's RED is `Not run`, because the skill did not exist before this change.
- GREEN ran the round 1 body. The round 2 edits (the pointer to the procedure file, the sentence on
  search snippets) do not touch the guideline rules, and this scenario was not run again.
- The runs inherited the user's installed plugins; one control run tried a plugin's browser tool and was
  refused permission.
