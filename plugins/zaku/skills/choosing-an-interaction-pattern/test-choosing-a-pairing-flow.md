# Test: choosing a pairing flow between a desktop helper and a browser extension

## Prompt

Each run is `claude -p` from its own empty scratch directory (`mktemp -d`), with skills disabled and
the prompt below as its only input. The control arm is handed the prompt alone:

```
Our desktop app's helper must pair with a browser extension; which pairing flow should we use?
```

The skill arm is handed, in this order: `Base directory for this skill: <skill directory>`, a blank
line, `SKILL.md` without its frontmatter, `Load no other skill.`, and the prompt above. The skill
directory's absolute path was replaced with `<skill directory>`.

## Inputs

None. The scratch directory is empty; the run has Read, Grep, Glob, WebFetch and WebSearch.

## Pass criteria

Fixed before the first run, and scored from the run's final answer.

1. Before any recommendation, the answer frames the decision: the task and how often it happens, the
   actors (from a profile, or marked as assumptions because none exists), the constraint no candidate
   may fail, and the date the rules are read for.
2. Before any recommendation, the answer cites prior art from at least two shipped products' or
   standards' own documents (a vendor's docs, an RFC or specification and its section, source code at
   a commit), each by name and URL or section.
3. A safety and law gate runs before any scoring: each candidate passes or fails it with a reason, and
   a failing candidate is out whatever its usability.
4. The remaining candidates are scored against named criteria, each criterion citing its source (a
   heuristic set, a standard, a study); "easy", "simple" or "friction" never stands as a criterion on
   its own.
5. The answer says which actor or context claims raised or lowered which criterion's weight.
6. The decision is recorded with its certainty, the open questions only users or later research can
   settle (each with a method), and what would reopen it.

## RED

Control arm, three runs, no skill loaded. The skill arm reads `Not run`: the skill did not exist.

| Run       | 1    | 2    | 3    | 4    | 5    | 6    |
| --------- | ---- | ---- | ---- | ---- | ---- | ---- |
| control A | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL |
| control B | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL |
| control C | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL |

Every run named native messaging in its first line, after no tool call at all, and then gave setup
steps and a fallback.

1. No run framed the decision. Each opened on the answer: "## Recommendation: use Native Messaging"
   (A); "Use **Native Messaging**. Avoid a localhost server with a pairing code." (B). Each closed by
   asking the user which browsers they target.
2. No run cited a document. Prior art came from memory: "Zoom's 2019 localhost web server is the
   well-known example" (A). A and C each said the answer was "general practice" or "general guidance".
3. No run put candidates through a gate. Security reasons were argued inside the recommendation, and
   two runs then offered the localhost server as a fallback with mitigations (A, B).
4. No run named a criterion with a source. C's case for its pick was ease: "The user doesn't have to
   pair anything. Installing the desktop app is enough."
5. No run named an actor, so no claim set a weight.
6. No run stated a certainty, an open question with a method, or what would reopen the choice.

## GREEN

Skill arm, handed the body as the harness delivers a loaded skill: the line naming the base directory,
the body without its frontmatter, then "Load no other skill.", then the prompt above.

Round 1, three runs:

| Run     | 1    | 2    | 3    | 4    | 5    | 6    |
| ------- | ---- | ---- | ---- | ---- | ---- | ---- |
| skill A | FAIL | FAIL | PASS | PASS | PASS | PASS |
| skill B | PASS | PASS | PASS | PASS | PASS | PASS |
| skill C | PASS | PASS | PASS | PASS | PASS | PASS |

- Every run read the documents first (11 to 20 turns) and wrote the record: Chrome and Firefox native
  messaging docs, KeePassXC, Bitwarden, Chrome Local Network Access, and Zoom's 2019 localhost server
  as failed prior art.
- Run A failed criteria 1 and 2 on order alone. It read the documents first, then opened its reply
  with "**Recommendation:** use the browser's **native messaging**", above the frame. The body had said
  the recommendation is written last, in the record, and A read that as covering the record but not
  the line above it.
- Criterion 3: every run gated the localhost server with no pairing out. B: "T1: Localhost
  HTTP/WebSocket server | **fail** | Websites can reach it, as Zoom and Logitech show."

Round 2, after the body said the reply opens on the frame and a summary line above the record counts
as the first sentence, three runs:

| Run     | 1    | 2    | 3    | 4    | 5    | 6    |
| ------- | ---- | ---- | ---- | ---- | ---- | ---- |
| skill A | PASS | PASS | PASS | PASS | PASS | PASS |
| skill B | PASS | PASS | PASS | PASS | PASS | PASS |
| skill C | PASS | PASS | PASS | PASS | PASS | PASS |

- Criterion 1: every reply opened on the record. A: "I've finished reading the vendor and browser
  documents. Below is the decision record."
- Criterion 4: every score cell named its criterion's source and a reason. C: "Recognition rather than
  recall (Nielsen #6) | 2 (A2 assumption: general skill) | 2 | 2: one click on a dialog naming the
  browser | 0: the user carries a code from the helper to the extension".
- Criterion 5: every run raised at least one weight on a named assumption: error prevention on A3 in
  A and B, recognition on A2 in C. B: "Error prevention (Nielsen #5) | **2** (A3, assumption)". B and C named the assumption most likely to change the
  ranking (B: "**This is the assumption most likely to change the ranking**"); A's Q1 says a yes would
  add B's approval on top of its pick.
- Criterion 6: every run gave two certainties, one for the safety reasoning and one for the usability
  ranking. C: "Safety reasoning: Moderate ... Usability ranking: Low".
- The runs did not agree on the pattern. A chose native messaging with no approval step, and B and C
  added a one-time approval in the helper. Each record says which assumption decides between them (the
  threat of a same-user process, or what the helper can do).

## Measurements

Model `claude-opus-5-5`, three runs per arm and per round, tools Read, Grep, Glob, WebFetch and
WebSearch, skills disabled.

| Run              | Cost  | Turns | Seconds |
| ---------------- | ----- | ----- | ------- |
| control A        | $0.05 | 2     | 18      |
| control B        | $0.06 | 2     | 25      |
| control C        | $0.06 | 2     | 21      |
| skill A, round 1 | $0.40 | 11    | 109     |
| skill B, round 1 | $0.50 | 20    | 116     |
| skill C, round 1 | $0.48 | 16    | 126     |
| skill A, round 2 | $0.58 | 19    | 133     |
| skill B, round 2 | $0.63 | 20    | 158     |
| skill C, round 2 | $0.47 | 15    | 119     |

## Limitations

- The skill did not exist, so no skill arm ran at RED.
- No product profile existed in any run, so criterion 5 was met by weights resting on assumptions.
  A decision weighted by a written profile ran in no scenario.
- No run could write a file, so every record came back as text.
- The scenario's gate is security. A gate on law or on deceptive design (a permission ask, a consent
  screen) ran in no scenario; every run found that no candidate steered a choice.
