# Test: dating a law for a dispute

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
A contract was signed in 2016, and the dispute over it is heard in 2026. Under Vietnam's law on promulgation of legal normative documents, can a provision added in 2020 apply to it? Answer with your sources.
```

## Inputs

None. The prompt carries the whole task.

## Pass criteria

Fixed before the runs. Each is scored on the run's final answer.

1. Every factual claim carries a source (a URL, or an instrument and its article) or the label
   "(unverified)". One claim stated as fact with neither fails the run.
2. The answer names the version of the instrument in force on the date that matters, and dates it from
   the text's own effect or commencement clause (its article number), not from a portal's date field
   or from memory.
3. The answer names the ambiguity in the question, which instrument and which date (signing, the
   conduct, the hearing) it means, and asks or states the reading it takes, instead of silently
   assuming one.
4. The answer reaches a primary source (the official gazette, the national legal database, or the
   interface behind it), or, where one fails, names the routes it tried; it never presents a secondary
   site as the primary text.

## RED

The skill arm is `Not run`: the skill did not exist before this change.

The control arm loaded no skill. Every run answered "generally no" from aggregator and law-firm pages,
gave the date of effect with no article behind it, and read the question one way without saying so.

| Run       | 1 source or (unverified) | 2 version from its effect clause | 3 names the ambiguity | 4 primary or routes named |
| --------- | ------------------------ | -------------------------------- | --------------------- | ------------------------- |
| control 1 | fail                     | fail                             | fail                  | fail                      |
| control 2 | fail                     | fail                             | fail                  | fail                      |
| control 3 | fail                     | fail                             | fail                  | fail                      |

- control 1, criterion 1: "The same rule was in Law No. 80/2015/QH13 (Articles 152 and 156), which was
  in force in 2016 and 2020", with no source; criterion 4: "I read these articles through summary sites,
  not the official text", having tried no primary route.
- control 2, criterion 2: "The governing rule (Law No. 64/2025/QH15, in force since 1 April 2025)",
  with no article for the date; criterion 4: its one failed route was a secondary site (HTTP 403).
- control 3, criterion 1: "Law 63/2020 was passed on 18 June 2020 but took effect on 1 January 2021",
  with no source; criterion 3: it never says which 2020 provision or which date it reads the question as.

## GREEN

Round 1 handed the body in which the procedure file was named as what "carries the routes". Round 2
handed the body in which the pointer became an instruction: "Before the first search for a law of the
EU, the UK or Vietnam, read `finding-the-law-in-force-on-a-date.md`".

| Run              | 1    | 2    | 3    | 4    | Opened the procedure | Read the database's JSON gateway |
| ---------------- | ---- | ---- | ---- | ---- | -------------------- | -------------------------------- |
| round 1, green 1 | pass | pass | pass | pass | yes                  | yes                              |
| round 1, green 2 | pass | pass | pass | pass | yes                  | yes                              |
| round 1, green 3 | pass | pass | pass | pass | no                   | no                               |
| round 2, green 1 | pass | pass | pass | pass | yes                  | yes                              |
| round 2, green 2 | pass | pass | pass | pass | yes                  | yes                              |
| round 2, green 3 | pass | pass | pass | pass | yes                  | yes                              |

- round 1, green 1, criterion 2: "Law 64/2025/QH15 in force from 1 April 2025 | Law 64/2025/QH15
  Art. 71(1), [MoJ gateway doc 175440]".
- round 1, green 2, criterion 3: "Left open: which instrument the 'provision added in 2020' belongs to.
  I answered the general rule and asked which law it is."
- round 1, green 3, criterion 4 passes on a government portal's full text with its failed routes named,
  but it says "I didn't try an archived snapshot or the official gazette PDF" and quotes the 2015 law
  from secondary sites, labelled as such. It never opened the procedure file.
- round 2, green 1, criterion 2 marks its own gap: "portal field, not the effect article (not read)".
- round 2, green 3, criterion 3: "which instrument added the 2020 provision, and was the contract signed
  before or after 1 July 2016?"

## Measurements

- Model: `claude-opus-5-5` through `claude -p`, one fresh process per run.
- Runs: control 3; GREEN round 1 3; GREEN round 2 3.
- Criteria 1 / 2 / 3 / 4 passed:
  - RED control: 0 / 0 / 0 / 0
  - GREEN round 1: 3 / 3 / 3 / 3
  - GREEN round 2: 3 / 3 / 3 / 3
- Tool calls: control 2, 5, 4; GREEN round 1 15, 18, 18; GREEN round 2 21, 12, 19.

## Limitations

- The skill arm's RED is `Not run`, because the skill did not exist before this change.
- The runs inherited the user's installed plugins. Two GREEN runs tried a browser tool a plugin
  provides and were refused permission; one control run said a plugin's hook asked it to open skills
  first. No plugin carries a rule on research.
- The procedure names no Vietnamese law by number, so a run that found the right instruments found them
  itself. Criterion 2 would score easier if it did.
- The scenario does not reach the EU or UK sections of the procedure.
- The fetch tool returns pages through a summarising model, so a "verbatim" quotation in a run may be a
  joined set of fragments; several runs said so. No criterion scores the exactness of a quotation.
