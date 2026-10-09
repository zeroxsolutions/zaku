---
name: choosing-an-interaction-pattern
description: Use when choosing how a flow works among patterns other products ship, before one is recommended
---

# Choosing an Interaction Pattern

## Overview

**Core principle:** a pattern is chosen from prior art read in shipped products' own documents,
through a safety and law gate, against named and sourced criteria that the product profile weights,
and the choice is recorded with its certainty and what would reopen it. A recommendation from memory,
ranked by ease, cannot be checked by the next reader, and it never says for whom it is easy.

The record is `docs/design/decisions/<decision>.md`, beside the product's profile and maps.

## When to Use

- How a flow works is about to be chosen: a pairing, a permission ask, an onboarding, a confirmation,
  a sign-in, an undo
- Someone asks which of several shipped patterns to use
- A recommendation exists with no prior art behind it, or ranked by "ease" alone
- Something a recorded decision lists under "Reopen if" has happened

## The order

Frame, collect prior art, gate, score, weight, record. The recommendation is written last, in the
record's Decision section, and the reply that carries the record opens on the frame. An answer that
names the pattern in its first sentence reads as though it skipped the steps before it, and its reader
cannot tell whether the pattern came from the documents or from memory, because both read the same. A
summary line above the record is that first sentence too: the reader takes it and stops.

## 1. Frame the decision

Write these before searching. Each one decides what the search looks for.

- **The task**, in the actor's words, and **how often** it happens: once per install, once per
  session, on every action. A pattern that suits a once-per-install task is a burden on a
  per-action one.
- **The actors**, read from `docs/design/profile.md`, which `profiling-a-product` writes: their goals,
  resources, environment and the traits that change a decision, each with its status. ISO
  9241-11:2018 defines usability for "specified users to achieve specified goals ... in a specified
  context of use" (3.1.1), so a pattern is chosen for that combination, not for a generic user.
  Where no profile exists, the record says so, and every actor claim it uses is an assumption with
  its question.
- **The gate**: the constraint no candidate may fail. A threat to close (who could pose as one side,
  read what passes, or act for the user), a law, a platform's rule.
- **The date** the rules are read for. Platform and browser rules move: Chrome's "Local Network
  Access" blog post listed WebSocket connections to the local network as "not yet gated", and the
  Chrome 147 release notes then made them "trigger permission prompts". A rule read for the wrong date answers the wrong
  question.

## 2. Collect prior art

Prior art is what a shipped product or a standard does, read in its own documents, in this order of
weight:

1. A standard that names the pattern: an RFC, a W3C or WHATWG specification, a platform consortium's
   specification, with its section.
2. The vendor's own documentation of a shipped product.
3. The product's source code, at a named commit.
4. Peer-reviewed studies of the pattern.
5. Community reports.

A pattern recalled from memory is not prior art: it carries whichever version of the product the
reader last saw, and the vendor may have changed it since. How a fact is sourced, dated and labelled
"(unverified)" is `researching-a-claim`'s; this skill needs the prior art itself.

For each product or standard, record: what the user does, step by step; what the system shows; what is
stored afterwards, where and for how long; what the vendor says the pattern protects against; and the
document's date or commit. Read the source where the docs are silent. Look for prior art that failed
as well: a product that shipped the pattern with the gap the gate names shows how easily the gap is
missed.

At least two products or standards are read before scoring. Where fewer exist, the record says which
searches found nothing.

## 3. Gate on safety and law

Every candidate is put through the gate before any scoring, and the gate's answer is `pass`,
`conditional` or `fail`, with the reason. A candidate that fails is out, whatever its scores. The gate
is never a weighted criterion, because a weighted total lets points for convenience buy back a failed
safety check.

The gate asks:

- **The threat named in the frame.** Can the attacker the frame names pose as one side, read what
  passes, or act for the user, without the user's help?
- **The laws and platform rules.** Each law the profile's legal table lists that the flow touches, and
  each platform's own review rules for the flow (a store's rules on permission asks, a browser's on
  extensions). Whether a law applies is read, not assumed.
- **Deceptive design.** The pattern matches no type in the European Data Protection Board's Guidelines
  03/2022 on deceptive design patterns (version 2.0, Annex I) or the FTC staff report "Bringing Dark
  Patterns to Light" (September 2022). Where the pattern steers a choice, it meets Richard Thaler's
  three principles ("The Power of Nudges, for Good and Bad", New York Times, 2015): "transparent and
  never misleading", "as easy as possible to opt out", and "good reason to believe that the behavior
  being encouraged will improve the welfare of those being nudged".

A candidate whose safety holds only while the user pays attention passes as `conditional`, and the
condition goes into the record. Kumar, Saxena, Tsudik and Uzun ("A comparative study of secure device
pairing methods", Pervasive and Mobile Computing 5, 2009) measured a "10% fatal error rate" for number
comparison, where a rushed "yes" accepted a mismatched pairing. A pattern where the inattentive path
ends in a refusal is safer than one where it ends in acceptance.

## 4. Score against named criteria

Each criterion names its source, and each cell is 0, 1 or 2 with a one-line reason. Nielsen calls his
heuristics "broad rules of thumb and not specific usability guidelines", so the reason beside the
number is what the reader checks.

| Criterion                      | Source and wording                                                                                                                                                           | What it asks of a pattern                                                   |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Visibility of system status    | Nielsen, "10 Usability Heuristics for User Interface Design", NN/g, #1: "keep users informed about what is going on"                                                         | Does the user see the state (waiting, done, refused) where they look?       |
| User control and freedom       | Same, #3: a "clearly marked 'emergency exit'"                                                                                                                                | Can the user cancel, undo or revoke?                                        |
| Consistency and standards      | Same, #4: "Follow platform and industry conventions"                                                                                                                         | Has the actor met this pattern before, in the products the prior art names? |
| Error prevention               | Same, #5: "eliminate error-prone conditions, or check for them"                                                                                                              | Where does an inattentive user end up: safe or exposed?                     |
| Recognition rather than recall | Same, #6: "The user should not have to remember information from one part of the interface to another"                                                                       | How much must the user carry between windows or devices?                    |
| Error recovery                 | Same, #9: messages "precisely indicate the problem, and constructively suggest a solution"                                                                                   | Does a failure say what to do next?                                         |
| Prompt and ability             | BJ Fogg, behaviormodel.org: "Behavior happens when Motivation, Ability, and a Prompt come together at the same time"                                                         | Is the prompt there at the moment ability is highest?                       |
| Drop-out stage                 | The CREATE Action Funnel as roadmap.sh's UX Design roadmap frames it: "Cue, Reaction, Evaluation, Ability, Timing, and Execution"; "a failure at any stage stops the action" | At which stage would this actor stop?                                       |
| Effectiveness                  | ISO 9241-11:2018, 3.1.12: "accuracy and completeness with which users achieve specified goals"                                                                               | Does the user reach the right end state, not just an end state?             |
| Efficiency                     | ISO 9241-11:2018, 3.1.13: "resources used in relation to the results achieved", with time and human effort among them                                                        | Steps, typing, time, and how often it recurs                                |
| Satisfaction                   | ISO 9241-11:2018, 3.1.14                                                                                                                                                     | Research only; recorded as an open question, never scored at the desk       |

"Easy", "simple", "seamless" and "friction" are not criteria. ISO 9241-11 says usability "is a more
comprehensive concept than is commonly understood by 'ease-of-use'" (Introduction, Note 2). Ease is
split into the criteria it stands for (recognition, efficiency, ability), each scored for the actor the
frame names. A ranking by ease alone leaves out error prevention, which is where a pairing or a
permission ask goes wrong.

The weighted total is a summary, not the decision. A candidate that wins on total by losing the
criterion the gate depends on does not win.

## 5. Let the profile set the weights

A weight above 1 names the profile claim that set it, with that claim's status:

- **A trait that names a decision** raises the criteria it touches. A low assumed digital skill raises
  recognition and efficiency; an action that is hard to undo raises error prevention.
- **The context of use** decides which channels exist: two windows on one screen, a phone in one hand,
  a shared room. RFC 8628 ("OAuth 2.0 Device Authorization Grant", 5.7) recommends that a code's
  channel "only be accessible by people in close proximity".
- **The markets** decide character sets. RFC 8628, 6.1: "Pure numeric codes are also a good choice for
  usability, especially for clients targeting locales where A-Z character keyboards are not used".

A weight that rests on an assumption carries that assumption's open question into the record. The
record also says which assumption, if it were false, would change the ranking, so the reader knows
which research to run first.

## 6. Record the decision

`docs/design/decisions/<decision>.md` holds every heading below. A section with nothing in it says
why.

```md
# Decision: <the flow, in the actor's words>

Decided <date>. Rules read as of <date>. Profile read: `docs/design/profile.md`, updated <date>.

## Frame

Task: <in the actor's words>. Frequency: <once per install, per session, per action>.
Actors: <the profile entries used, each with its status>.
Gate: <the threat, the laws, the platform rules>.

## Prior art

| Product or standard | What the user does | What is stored, where, for how long | What it protects against | Source, with its date or commit |
| ------------------- | ------------------ | ----------------------------------- | ------------------------ | ------------------------------- |

## Gate

| Candidate | Result | Reason |
| --------- | ------ | ------ |

## Scores

| Criterion (source) | Weight (the profile claim that set it) | <candidate> | <candidate> |
| ------------------ | -------------------------------------- | ----------- | ----------- |

## Decision

<The pattern, in one sentence.> Why it wins over each runner-up: <one line each>.

Certainty: <High, Moderate, Low or Very low>, lowered by <the factor>.

## Open questions

| Id  | Question | Method | What it would change |
| --- | -------- | ------ | -------------------- |

## Reopen if

- <a fact, with where it would be announced, that would change the decision>
```

**Certainty** uses the four levels the GRADE Handbook gives the quality of a body of evidence (GRADE
Working Group, updated October 2013, section 5): High, Moderate, Low and Very low, lowered by study
limitations, inconsistency, indirectness, imprecision or publication bias. For a product decision, indirectness is evidence about another
population, platform or task. Where the safety reasoning and the usability ranking rest on different
evidence, each gets its own level, because a normative specification and one small study are not
equally certain.

**Open questions** are the ones only real users or later research can settle: each names its method
and what its answer would change. The agent never closes one. A question about who the actor is goes
into the profile, where `profiling-a-product` keeps it.

**Reopen if** lists the facts that would change the decision: a platform rule shipping or being rolled
back, an API appearing, a profile assumption proved false.

## Common Mistakes

| Mistake                                              | Instead                                                          |
| ---------------------------------------------------- | ---------------------------------------------------------------- |
| The pattern in the first sentence                    | The record, with the recommendation in its Decision section      |
| Prior art from memory: "the well-known example"      | The vendor's document or the standard's section, with its date   |
| Security reasoning mixed into the score              | The gate first; a failing candidate is out                       |
| "The user doesn't have to do anything" as the reason | The criteria it stands for, each with its source                 |
| A recommendation for "users"                         | The actors from the profile, or assumptions with their questions |
| Questions to the asker in place of a record          | Open questions in the record, each with its method               |
| One certainty for the whole decision                 | One per body of evidence, with the factor that lowered it        |
