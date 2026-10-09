# Test: preparing the design of a new app before its first screen

## Prompt

Each run is `claude -p` from its own empty scratch directory (`mktemp -d`), with skills disabled and
the prompt below as its only input. The control arm is handed the prompt alone:

```
We are about to design the onboarding of a mobile and web app for tourists visiting Vietnam; set up what the design work needs first.
```

The skill arm is handed, in this order: `Base directory for this skill: <skill directory>`, a blank
line, `SKILL.md` without its frontmatter, `Load no other skill.`, and the prompt above. The skill
directory's absolute path was replaced with `<skill directory>`.

## Inputs

None. The scratch directory is empty; the run has Read, Grep, Glob, WebFetch and WebSearch.

## Pass criteria

Fixed before the first run, and scored from the run's final answer.

1. The answer's deliverable is a written product profile (a file or a document with named sections),
   and it picks no onboarding screen, step or flow.
2. The profile records the business and its model in canvas blocks (customer segments, problem,
   value proposition, revenue streams, key metrics or their equivalents), not only a product mission.
3. The target actor, the target action and the target outcome are three separate entries, and the
   action and the outcome each carry a metric.
4. The segments' traits cover age, gender or gender identity, culture and language, ability, and
   device, and every trait stated as a fact cites a source (a named publication or URL); a trait with
   none is labelled an assumption.
5. The profile applies at least two of Fogg's B=MAP, Wendel's CREATE and Eyal's Hook to the target
   action.
6. The runtimes are listed as runtime by width class, with native desktop (macOS, Windows, Linux)
   named as shipped or not shipped on its own, never folded into "web".
7. The markets name where the business operates, where users come from and whom it targets, and the
   laws are named as items a later legal check reads, not as a conclusion that a law applies or not.
8. Every claim in the profile is marked evidence or assumption, and every assumption names the
   question or test that would settle it.

## RED

Control arm, three runs, no skill loaded. The skill arm reads `Not run`: the skill did not exist.

| Run       | 1    | 2    | 3    | 4    | 5    | 6    | 7    | 8    |
| --------- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| control A | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL |
| control B | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL |
| control C | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL |

Every run answered with a design brief: the facts it found on the web, proto-personas, a list of
decisions with suggested defaults, and a draft onboarding flow.

1. Every run picked onboarding decisions. A drew a "Draft flow skeleton" and answered its own questions
   ("Is an account required before value? | **No.**"); B wrote "## 3. Starting onboarding flow (for
   wireframing)"; C recommended "No. Let people use it as a guest first".
2. No run wrote a business model; each asked for one. A: "Core value proposition and business model
   (bookings? subscription? partner deals?)".
3. No run separated actor, action and outcome. Each listed success metrics for onboarding ("Share of
   users who finish onboarding", C) with no target action they measure.
4. No run covered age, gender or ability as segment traits, and every persona trait was unsourced. A:
   "Backpacker / long-stay: travels north to south over 3-8 weeks with a tight budget". B: "Many don't
   read English well."
5. No run named a behaviour model.
6. Every run wrote mobile and web as three platforms and never named native desktop. B: "Platforms:
   iOS, Android and responsive web, sharing one design system."
7. Every run gave users' home countries only, and two concluded which laws apply. C: "Also cover GDPR
   for EU users and PIPL for Chinese users." A: "GDPR for EU visitors, Vietnam's personal data rules."
8. Two runs labelled their personas as a group ("proto-personas, to validate", A; "draft personas, to
   be checked with research", C); no run marked a claim, and no assumption named a test.

## GREEN

Skill arm, handed the body as the harness delivers a loaded skill: the line naming the base directory,
the body without its frontmatter, then "Load no other skill.", then the prompt above.

Round 1, three runs:

| Run     | 1    | 2    | 3    | 4    | 5    | 6    | 7    | 8    |
| ------- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| skill A | PASS | PASS | FAIL | PASS | PASS | PASS | PASS | PASS |
| skill B | PASS | PASS | FAIL | PASS | PASS | PASS | PASS | PASS |
| skill C | PASS | PASS | FAIL | PASS | PASS | PASS | PASS | PASS |

- Every run wrote `docs/design/profile.md` in full and stopped there: "It doesn't pick any screens,
  step order, sign-in method or defaults. Each of those is an open question in the profile instead"
  (A).
- Criterion 3 failed in every run: the three entries were separate rows with a metric column, but the
  action and both outcomes read "Undefined" (A), "Unknown" (B) or "to be defined" (C). The skill said a
  row the team cannot fill "stays, marked `assumption`", and the runs read that as permission to
  leave it empty.

Round 2, after the body required a best guess stated as a claim, three runs:

| Run     | 1    | 2    | 3    | 4    | 5    | 6    | 7    | 8    |
| ------- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| skill A | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| skill B | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| skill C | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |

- Criterion 3: every run wrote an action and two outcomes with metrics, as critical assumptions. C:
  "We believe: completes first use, meaning sets language and trip dates, then uses one core feature
  ... | % of installers doing it within 24 h of install | assumption (critical: the brief names no
  action)".
- Criterion 6: every run filled the native desktop rows on their own. A: "macOS, native | - | no | No
  native desktop app is planned".
- Criterion 7: every legal row named the fact that raised it and left `Read by` empty. B: "It doesn't
  say any law applies."
- Criterion 4: the two runs that fetched data marked it evidence with its source and month, and the
  rest stayed assumptions. B: "StatCounter, mobile OS, Sept 2026, page views, may be revised 45 days".

Round 3, after a wording fix that made the Business paragraph agree with the best-guess rule (it had
still quoted Maurya's "it's okay to leave boxes blank"), three runs:

| Run     | 1    | 2    | 3    | 4    | 5    | 6    | 7    | 8    |
| ------- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| skill A | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| skill B | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| skill C | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |

- No row read "unknown" or "to be defined"; the one block left empty was the unfair advantage, as
  "none yet" (all three runs).
- Every run closed by naming the open questions to answer first and how a later decision cites the
  profile. A: "for `in-country-visitor`, whose Device row is an assumption, Q10".

## Measurements

Model `claude-opus-5-5`, three runs per arm and per round, tools Read, Grep, Glob, WebFetch and
WebSearch, skills disabled.

| Run              | Cost  | Turns | Seconds |
| ---------------- | ----- | ----- | ------- |
| control A        | $0.17 | 4     | 51      |
| control B        | $0.17 | 5     | 43      |
| control C        | $0.10 | 3     | 38      |
| skill A, round 1 | $0.15 | 2     | 45      |
| skill B, round 1 | $0.19 | 2     | 64      |
| skill C, round 1 | $0.17 | 2     | 53      |
| skill A, round 2 | $0.23 | 4     | 73      |
| skill B, round 2 | $0.30 | 8     | 99      |
| skill C, round 2 | $0.16 | 2     | 55      |
| skill A, round 3 | $0.23 | 2     | 87      |
| skill B, round 3 | $0.24 | 2     | 94      |
| skill C, round 3 | $0.24 | 3     | 91      |

## Limitations

- The skill did not exist, so no skill arm ran at RED.
- No run could write a file, so every run returned the profile as text; criterion 1 was scored on the
  text it returned.
- The scenario starts with no profile. Reading an existing profile before a decision, and adding a
  missing entry to it, ran in no scenario.
- The action rows of rounds 2 and 3 are hypotheses about the target action. Two of them lean on a
  flow choice: round 2 C's "sets language and trip dates" names first-run steps, and round 3 A's
  "without being asked for an account first" names a sign-in decision. Both were scored a target
  action rather than a flow, because each sits in the profile as a critical assumption with its
  question; a stricter reading fails criterion 1 for those two runs.
