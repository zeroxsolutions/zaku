---
name: researching-a-claim
description: Use when a decision rests on an outside fact, such as a law, a guideline or a finding, before it is stated
---

# Researching a Claim

## Overview

**Core principle:** an outside fact reaches the reader with its source, its date and its strength beside
it, or labelled "(unverified)", at the moment it is written.

A product or design decision often rests on something the team does not own: a law, a platform's
guideline, a market figure, a behavioural finding, what users wrote. A claim recalled from memory reads
exactly like one read off its source. The reader cannot tell which one they hold, and a decision built on
the recalled one carries an error that nobody can trace later.

## When to Use

- An answer, a spec, a design or a skill is about to state a law, a guideline, a figure, a finding or
  what users said
- Someone asks whether a rule applies, or which version of it applied on a date
- A claim from an earlier note, report or session is about to be repeated
- A primary source does not load, and a secondary page is the one at hand

## The research note

Every answer that states an outside fact ends with this note, every slot filled. A slot with nothing to
put in it says so: "none", "undated", "no route failed".

```md
**Question as read:** <the instrument, platform or population, and the date that matters>.
<What the question left open, and the reading taken or the question asked back.>

| Claim               | Source                                                      | Version or date                    | Strength                    |
| ------------------- | ----------------------------------------------------------- | ---------------------------------- | --------------------------- |
| <one claim per row> | <primary URL, or the text and its section>; or (unverified) | <the source's own date or version> | <in the source's own terms> |

**Routes tried:** <each route to a primary source that failed, and what it returned>
**Inference:** <each reading, grouping or conclusion that is the writer's own, not a source's>
```

The table holds every factual claim the answer makes, including the ones the answer only mentions in
passing: a date of effect, an article number, a figure, a size. A claim that is not in the table is a
claim the reader has no way to check.

## The claim's source

**Memory is never a source.** A claim with nothing fetched behind it is written "(unverified)" in the
row where it first appears. It is not upgraded to a fact because it sounds right, and it is not labelled
only after someone asks. When a claim is challenged, the answer is a fetched source or "(unverified)",
never a second recalled claim, because a recalled correction carries the same defect as the claim it
replaces.

**The source is the primary text.** Primary is the document that carries the authority: the official
gazette or journal, the standards body's dated version, the vendor's own guideline page or the data it
loads, the paper itself. A summary, an aggregator, a law firm's article or a blog points the way to it,
and the note cites what it points at. Mike Caulfield's SIFT ("SIFT (The Four Moves)", 2019) gives the
move: "Trace claims, quotes, and media back to the original context". A secondary page cited because no
primary route worked is written "<site> (secondary)", and the routes that failed go under `Routes tried`.
A search result's snippet is not a source either: it says where a page is, and the row cites the page
once it has been opened.

**A claim from an earlier note, report or session is a lead.** Restating it checks it against its
source first, because a claim repeated without a check gains authority each time and no evidence.

**A grouping the writer made up is the writer's.** A count of kinds, a classification or a set of
categories with no source behind it goes under `Inference`, never into the table as a found fact. A
reader cites a table row as a fact about the world.

## When the primary source does not load

A page that renders in the browser hands a plain fetch its empty shell, which reads as "no content"
when the content is one request away. Before falling back to a secondary page, try each route and write
what it returned under `Routes tried`:

1. The data the page loads: the JSON or API its scripts call, found in the page's HTML or its script
   bundle.
2. The official print: the gazette's PDF, the document's attachment, the standard's dated version.
3. An archived snapshot of the same page, cited with the snapshot's date.

Only after these fail does a secondary page enter the note, labelled as secondary.

## A rule at a date

**The note names the date that matters before any search.** A rule can be asked about at the date of
the conduct, the signing, the hearing, a launch or today, and the version in force differs between
them. Where the question leaves the instrument or the date open, the answer names each reading and
either asks which one is meant or states the one it takes. Answering one reading in silence answers a
question nobody asked.

**The version in force comes from the text's own effect clause.** The note cites the article of the
instrument that sets its commencement, and the article of any amending or replacing instrument that does
the same. A portal's date field, a consolidated text's header and a summary's date are not that clause:
EUR-Lex states that "Consolidated texts have no legal effect" and that the date in a consolidated text's
header is the date the latest amendment in it becomes applicable. A later provision reaches earlier
conduct only where its own text, or the law on how laws apply, says so, and the note cites that clause
too.

**A transitional clause can keep the old rule for the case.** Before applying a new version, the note
reads the transitional articles of the instrument that brought it in.

Before the first search for a law of the EU, the UK or Vietnam, read
`finding-the-law-in-force-on-a-date.md`. It carries the route to each one's version in force, including
the data behind a database that renders in the browser, and the date fields that mislead.

## Guidance: its date and its strength

**Every guideline cited carries its own date or version.** A standard carries its dated version
("WCAG 2.2, W3C Recommendation 12 December 2024"). A vendor's page carries its change-log or "last
updated" date, which often sits in the data the page loads rather than on the rendered page. A page with
none is written "undated". A forum post or an issue carries its post date. Guidance changes without a
version number, and an undated citation cannot be checked against the page a reader opens later.

**Every guideline cited carries its strength, in that document's own terms:**

| The document declares           | Read it as                                                                                                                                                                                                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RFC 2119 key words              | MUST is "an absolute requirement"; SHOULD means "there may exist valid reasons in particular circumstances to ignore a particular item" (RFC 2119). Only the UPPERCASE words carry that meaning, and lowercase ones have their ordinary English sense (RFC 8174) |
| ISO verbal forms                | "shall" is a requirement, "should" a recommendation, "may" a permission, "can" a possibility, and "must" an external constraint, not a requirement of the document (ISO/IEC Directives, Part 2)                                                                  |
| normative and informative parts | only the normative part sets requirements; notes, examples and non-normative sections are informative (WCAG 2.2, "Interpreting Normative Requirements")                                                                                                          |
| no convention                   | a recommendation, in the document's own words, quoted                                                                                                                                                                                                            |

A spec that turns a recommendation into a hard requirement says that the requirement is the team's
decision, and cites the recommendation as what it rests on.

## What users wrote

**The quote and its reading are separate.** A piece of feedback is quoted verbatim, in its original
language, with its rating, date and channel. A translation and the reading of it sit in their own slots
beside the quote, never in place of it. A reading pasted into the quote cannot be checked against the
words, and a translation in place of the original hides its own errors.

**Where feedback hedges, defers or praises mildly beside a low rating, the reading includes a possible
complaint or a quiet refusal, labelled as an inference.** Speakers soften a complaint toward someone of
higher standing: in a study of 150 Vietnamese university students, the students were more direct with
peers and "opted for indirectness" with those of higher power, "to maintain harmony and avoid
conflicts" (Thai Hong Ly and Thuy Ho Hoang Nguyen, "Social Power and Strategies of Complaint and Complaint
Responses in Vietnamese", Hue University Journal of Science: Social Sciences and Humanities 135(6B),
2026). Reading a
review written to a product team that way is the writer's inference, not the study's finding, so it goes
under `Inference`.

## Common Mistakes

| Mistake                                                                     | Instead                                                                                                      |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| A table of which law governs, written from memory                           | A row per claim, each with its fetched source or "(unverified)"                                              |
| Answering "why?" with a second recalled claim stated as fact                | Fetch the source, or say the claim is unverified                                                             |
| Verifying only after being asked how sure you are                           | Fill the `Source` slot when the claim is written                                                             |
| The official database returns nothing, so a summary site becomes the source | Try the data behind the page, the gazette PDF, the attachment and an archive; label the summary as secondary |
| Assuming which law and which date a question means                          | Name the readings, then ask or state the one taken                                                           |
| The in-force date taken from a portal's field                               | The commencement article in the text                                                                         |
| A classification of your own stated as a found fact                         | Put it under `Inference`                                                                                     |
| Repeating an earlier report's conclusion as settled                         | Check it against its source, or mark it unverified                                                           |
| A vendor's recommendation written into a spec as a platform requirement     | Its strength in the vendor's terms, and the requirement named as the team's                                  |
| A review translated or paraphrased inside the quote                         | The verbatim quote, then the translation and the reading in their own slots                                  |
