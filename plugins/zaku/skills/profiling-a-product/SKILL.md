---
name: profiling-a-product
description: Use when a design decision needs to know who a product is for, before its audience, runtimes or markets are guessed
---

# Profiling a Product

## Overview

**Core principle:** a UX or visual decision reads a written product profile, and every claim in that
profile says whether it is evidence or an assumption, because a decision built on an unwritten audience
cannot be checked and cannot be reopened when the audience turns out different.

The profile is `docs/design/profile.md`, beside the rest of the product's design. It is written before
the first screen, flow or style is chosen, and every later decision names the entries it read.

## When to Use

- A screen, a flow, an onboarding, a permission ask or a visual style is about to be chosen, and the
  product has no `docs/design/profile.md`
- A decision needs a trait, a runtime or a market the profile does not hold, or holds only as an
  assumption
- Someone asks to "set up" or "start" the design of a product
- Options are being ranked and nobody has said for whom

## The first thing the work produces

When the profile does not exist, the answer to "set up the design" is the profile, and nothing else.
It picks no screen, no step order, no default and no sign-in method: each of those is a decision the
profile exists to inform, and a default proposed before the actor is written is a guess that reads
like a finding. Questions the team must answer go into the profile as open questions, not into a list
of decisions with suggested defaults.

When the profile exists, read it first. A decision names the profile entries it rests on ("for the
actor `first-time visitor`, whose digital skill is an assumption, Q3"). A decision that needs an entry
the profile lacks adds that entry, as an assumption with its question, before it is made.

## The profile, in this order

Every table below is REQUIRED. A row the team cannot confirm yet holds its best guess, marked
`assumption`, with the open question that would test it. A row that is deliberately empty says why
("none: no native desktop app is planned").

```md
# Product profile: <product>

Updated <date>. Owner: <who may move a claim from assumption to evidence>.

## Business

| Block                    | Claim                      | Status | Source or question |
| ------------------------ | -------------------------- | ------ | ------------------ |
| Customer segments        | <who pays>                 |        |                    |
| Early adopters           |                            |        |                    |
| Problem                  | <top one to three>         |        |                    |
| Existing alternatives    |                            |        |                    |
| Unique value proposition |                            |        |                    |
| Solution                 |                            |        |                    |
| Channels                 |                            |        |                    |
| Revenue streams          |                            |        |                    |
| Cost structure           |                            |        |                    |
| Key metrics              |                            |        |                    |
| Unfair advantage         | <blank until there is one> |        |                    |

## Target actor, action and outcome

| Entry                    | Claim                                | Metric | Status | Source or question |
| ------------------------ | ------------------------------------ | ------ | ------ | ------------------ |
| Actor                    | <goal, context, constraints>         | -      |        |                    |
| Action                   | <the behaviour the product asks for> |        |        |                    |
| Outcome for the actor    |                                      |        |        |                    |
| Outcome for the business |                                      |        |        |                    |

## Segments

### <segment id>

Goal, in its circumstance: <the progress sought, and when>.

| Trait                      | Value | Decision it changes | Status | Source or question |
| -------------------------- | ----- | ------------------- | ------ | ------------------ |
| Age                        |       |                     |        |                    |
| Gender and gender identity |       |                     |        |                    |
| Culture and language       |       |                     |        |                    |
| Ability                    |       |                     |        |                    |
| Digital skill              |       |                     |        |                    |
| Device and runtime         |       |                     |        |                    |
| Context of use             |       |                     |        |                    |

## Behaviour

| Model  | For the target action                                                   | Status | Source or question |
| ------ | ----------------------------------------------------------------------- | ------ | ------------------ |
| B=MAP  | <motivation; ability; the prompt and where it appears>                  |        |                    |
| CREATE | <the stage this actor is likeliest to stop at, and why>                 |        |                    |
| Hook   | <only for an action meant to repeat; otherwise "not a repeated action"> |        |                    |

## Runtimes

| Runtime         | Width classes | Shipped | Why |
| --------------- | ------------- | ------- | --- |
| iOS, native     |               |         |     |
| iPadOS, native  |               |         |     |
| Android, native |               |         |     |
| macOS, native   |               |         |     |
| Windows, native |               |         |     |
| Linux, native   |               |         |     |
| Web on iOS      |               |         |     |
| Web on iPadOS   |               |         |     |
| Web on Android  |               |         |     |
| Web on macOS    |               |         |     |
| Web on Windows  |               |         |     |
| Web on Linux    |               |         |     |

## Markets

| List            | Entries                                                                        | Status | Source or question |
| --------------- | ------------------------------------------------------------------------------ | ------ | ------------------ |
| Operates in     |                                                                                |        |                    |
| Users come from |                                                                                |        |                    |
| Targets         | <languages offered, currencies, where marketing is aimed, behaviour monitored> |        |                    |

### For the legal check

| Law or regulator | The fact above that makes it worth reading | Read by | Date |
| ---------------- | ------------------------------------------ | ------- | ---- |

## Open questions

| Id  | Question | Settles | Method | Status |
| --- | -------- | ------- | ------ | ------ |
```

## Every claim is evidence or an assumption

`Status` is `evidence` or `assumption`, on every row. Evidence names its source in the last column; an
assumption names the open question that would test it, by id. The methods the profile draws on all
treat a first draft as hypotheses: Ash Maurya asks for each belief to be tagged "a leap of faith", "an
anecdotal observation" or "a fact (based on empirical data)" ("What is the Right Fill Order for a Lean
Canvas?", 2019), and David J. Bland's assumptions map sorts beliefs by importance and by evidence and
says to "focus on the top right quadrant", the critical beliefs with the least evidence ("Assumptions
Mapping", Strategyzer, 2020). A profile without the column hands every guess to the next decision as a
fact.

An assumption is a guess stated as a claim, never "unknown" or "to be defined". Maurya says "you
start with the best guess and iterate from there" ("What is Lean Canvas"), and Bland writes each
hypothesis as "We believe that ..." with its importance and its evidence ("Assumptions Mapping"). A
row that reads "unknown" gives its open question nothing to confirm or refute, and a metric left
"to be defined" is the one a later design is never measured against. Where the brief gives no target
action, the profile writes the likeliest one, with its metric, as a critical assumption.

An open question names the claims it settles and the method that would answer it: interviews, a
survey, analytics, a usability test. The agent never marks one answered; only a result from real
people does. Nielsen Norman Group calls personas built only from the team's assumptions "proto
personas" and says to treat them as hypotheses to validate ("3 Persona Types", 2020).

How an outside fact is sourced, dated and graded, and when it is written "(unverified)", is
`researching-a-claim`'s. A trait stated as a fact with no source behind it is an assumption, and this
profile labels it one.

## Business

The blocks are Ash Maurya's Lean Canvas ("What is Lean Canvas", 2024), which roadmap.sh's UX Design
roadmap lists under "Business Model" beside the Business Model Canvas. A customer is the one who pays
and a user is not, in Maurya's words: "A customer is someone who pays for your product. A user does
not." The canvas starts before any user is met, each block holding the team's best guess. The one
block Maurya says to leave empty is the unfair advantage: it is "always better to leave the unfair
advantage box blank" at the outset. That row reads "none yet", and stays in the table.

## Target actor, action and outcome

roadmap.sh's "Understanding the Product" branch defines three entries (github.com/nilbuild/
developer-roadmap, `roadmaps/ux-design/content/`): the target actor, "defined by their goals, context,
and constraints rather than just demographics"; the target action, "the specific behavior the product
is designed to get users to perform"; and the target outcome, "the result the business or user gets
once the target action is completed". The action and the outcome are separate rows with separate
metrics, because Stephen Wendel's "Designing for Behavior Change" (2nd ed., O'Reilly, 2020) closes the
chapter that defines them with "Reminder: Action != Outcome" (chapter 6): a design can raise the action
and leave the outcome where it was, and one metric cannot show it.

## Segments and their traits

Every trait row names the decision it changes. Nielsen Norman Group's filter for persona fields is "if
it would not affect the final design or help make any decision easier, remove it" ("Personas Make
Users Memorable for Product Team Members", 2025). A trait with no decision is decoration, and a
demographic label on its own invites the reader to design for a stereotype.

| Trait                      | What the row records                                                                                                                                                                                                                      | Source                                                                                                                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Age                        | a band only where it changes a decision (a children's product, a legal age); otherwise the capabilities it would stand for                                                                                                                | Nielsen Norman Group, "Usability for Older Adults: Challenges and Changes" (2019): the 65+ cut-off "is a simplification"; W3C WAI, "Older Users and Web Accessibility"               |
| Gender and gender identity | the range of GenderMag's five facets the segment spans (motivation, information processing style, computer self-efficacy, attitude to risk, learning by process or by tinkering), never a gender; whether the service needs to ask at all | Burnett et al., "GenderMag", Interacting with Computers 28(6), 2016: "the gender label itself is not the point"; GOV.UK Design System, "Equality information"                        |
| Culture and language       | locale, language, script, calendar, currency and units as explicit settings; never a preference read off a country score                                                                                                                  | Hofstede's own site calls country scores "rough 'climate maps'" ("6-D model of national culture")                                                                                    |
| Ability                    | the conformance target (for example WCAG 2.2 AA), and for the target action the senses and inputs it needs, in permanent, temporary and situational form                                                                                  | W3C, WCAG 2.2; Microsoft Inclusive Design toolkit (2016), the Persona Spectrum                                                                                                       |
| Digital skill              | the assumed skill level, and whether first use is in scope                                                                                                                                                                                | Nielsen Norman Group, "The Distribution of Users' Computer Skills" (2016), from the OECD's survey: for a broad audience, "assume that users' skills are those specified for level 1" |
| Device and runtime         | the devices the segment carries, with the share data that says so, its month, and what it counts                                                                                                                                          | StatCounter's FAQ: its figures are page views, "not unique visitors", and are revised for 45 days                                                                                    |
| Context of use             | the goal, the resources (device, input, connectivity) and the environment (physical, social)                                                                                                                                              | ISO 9241-11:2018, 3.1.15: "combination of users, goals and tasks, resources, and environment"                                                                                        |

A share figure is read for the countries the users come from, not globally, and it records the month,
because the Markets table decides whose devices matter and a global figure answers for nobody in it.

## Behaviour

roadmap.sh's UX Design roadmap frames the behaviour models the profile applies to the target action:

- Fogg's Behavior Model: "three core elements ... motivation, ability, and prompts". BJ Fogg states it
  as "Behavior happens when Motivation, Ability, and a Prompt come together at the same time"
  (behaviormodel.org). The row says which of the three is weakest for this actor and where the
  prompt appears.
- The CREATE Action Funnel: "Cue, Reaction, Evaluation, Ability, Timing, and Execution", where "a
  failure at any stage stops the action". The row names the stage this actor is likeliest to stop
  at.
- Nir Eyal's Hook Model: "trigger, action, variable reward, and investment", a loop for "habitual
  engagement". The row is filled only when the target action is meant to repeat; a one-time action
  writes "not a repeated action", because a habit loop designed around a one-time act has nothing to
  bring the actor back to.

Each row is an assumption until a test of the real action says otherwise.

## Runtimes

A runtime is what the code runs in; a width class is the window it is given. They are two columns,
because the same width is two different products: a native macOS window at expanded width has a menu
bar, window management and file access that a browser tab at the same width does not, and a web page
in a desktop browser is not the native desktop app. A profile that writes "the web covers desktop"
leaves every native desktop decision unmade while reading as if it made them.

Every row of the template is filled with `yes` or `no` and a reason. A runtime left out is a row with
`no`, so a later reader can tell a decision from an omission. Width classes use Android's window size
classes, in dp ("Use window size classes", Android Developers): compact below 600, medium 600 to 839,
expanded 840 to 1199, large 1200 to 1599, extra-large 1600 and up. A desktop share of page views is
web traffic and says nothing about who would install a native app.

The shipped rows are the ones the product's design targets in `docs/design/zaku.yaml` draw from.

## Markets and the legal check

Markets are three lists, because legal reach can turn on the third. GDPR Article 3(2) reaches a
controller outside the EU that offers goods or services to people in the Union, and Recital 23 counts
"the use of a language or a currency generally used in one or more Member States" as a sign of that
intent, while "the mere accessibility" of a website is not (Regulation (EU) 2016/679). The European
Data Protection Board's Guidelines 3/2018 on territorial scope (version 2.1) add "the international
nature of the activity at issue, such as certain tourist activities". Where users come from and whom
the product targets are therefore separate rows, and the Targets row lists the languages, the
currencies, where marketing is aimed and whether behaviour is monitored.

The legal table names each law or regulator worth reading and the profile fact that raised it, and
leaves `Read by` empty for a person. It never says a law applies or does not: that conclusion needs the
law's text read on the date that matters, which is `researching-a-claim`'s, and a legal reviewer's
judgement, which is not the agent's.

## Common Mistakes

| Mistake                                          | Instead                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| A brief with a draft flow and suggested defaults | The profile only; each question as an open question                |
| Personas with traits and no source               | A Status column on every trait; no source makes it an assumption   |
| "iOS, Android and responsive web"                | Twelve runtime rows, each shipped or not, with width classes       |
| "The web covers desktop"                         | Native desktop rows answered on their own                          |
| "GDPR applies to EU visitors"                    | The law in the legal table, with the fact that raised it, unread   |
| Age and gender as labels                         | The decision each changes; GenderMag's facets in place of a gender |
| Ranking options before the actor is written      | The profile first, then the decision naming its entries            |
