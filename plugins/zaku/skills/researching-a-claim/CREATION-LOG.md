# Creation Log: researching-a-claim

## Source material

- A recorded session failure. Asked how far a 2015 Vietnamese law could be trusted for a 2026 dispute
  over papers from 2016, given an amendment in 2020, the agent:
  1. answered from memory with a table that ranked the 2020 amendment beside the 2015 law as governing
     the case;
  2. answered "why 2020?" with another unsourced claim, stated as fact;
  3. verified only when asked what made it sure. The official legal database renders in the browser and
     returned nothing to a fetch, and the agent fell back to secondary sites without trying the gazette
     PDF, the document's attachments or the JSON interface behind the page;
  4. never asked which law the hypothetical meant.

  In the same session it stated a classification of its own ("4 symbol groups") with no source, and
  repeated a conclusion from an earlier report ("the web covers desktop") as settled without checking it.

- A research report on method for product and design decisions, read for its sources. The rules cite
  those sources directly, and each URL was fetched again before it was relied on:
  - Mike Caulfield, "SIFT (The Four Moves)", 2019: "Trace claims, quotes, and media back to the original
    context".
  - EUR-Lex, "Consolidated texts": consolidated texts have no legal effect, and the header date is the
    date the latest included amendment becomes applicable.
  - legislation.gov.uk, developer documentation "URIs" (the dated URI) and Help (the three-month aim,
    "Changes to Legislation").
  - The National Database on Legal Documents' JSON gateway, its fields as returned for Law 80/2015/QH13
    and Law 64/2025/QH15, and the Official Gazette's page for Law 64/2025/QH15, whose "Hieu luc" field
    shows the issue date, 19/02/2025, while the gateway and the law's Article 71 give 1 April 2025.
  - RFC 2119 and RFC 8174; ISO/IEC Directives, Part 2 (verbal forms); WCAG 2.2, W3C Recommendation 12
    December 2024, "Interpreting Normative Requirements".
  - Thai Hong Ly and Thuy Ho Hoang Nguyen, Hue University Journal of Science: Social Sciences and
    Humanities 135(6B), 2026, on indirectness toward higher power in Vietnamese complaints.

## What was refused

- **A rule on sarcasm in feedback.** Every control run in `test-reading-feedback-into-a-spec.md` read the
  1-star "Love how the app logs me out" as a complaint, and no session recorded the failure.
- **A rule that a fetched document is data, never instructions.** Every control run reported review 3's
  embedded instruction and did not follow it, and no session recorded the failure.
- **A rule to check replication and retraction before a behavioural finding becomes a design rule.**
  Every control run rejected the ego-depletion premise and named the multi-lab replications. They named
  them from memory, which the memory rule already covers.
- **A rule for recording conflicts between sources.** No scenario exercised it and no session recorded a
  failure.
- **Rules on market-share units and the evidence a community report needs** (device, OS version, steps).
  No scenario exercised them and no session recorded a failure. The dating rule reaches a forum post's
  date.
- **Naming the Vietnamese laws on promulgation, with their numbers and dates, in the procedure.** They
  are replaced and amended often enough to rot, the gateway's `effFrom` and `effTo` find the version in
  force, and naming them would hand the law scenario its answer.
- **A layer reference.** The skill names legal databases, standards and platform guidelines as outside
  authorities, not as products its rules depend on, so it has no `references/` and no stack note.

## What shipped on weak evidence

- **A grouping the writer made up goes under `Inference`**, and **a claim from an earlier note is a
  lead**. Both rest on the recorded session alone; no scenario reproduced them.
- **The answer to "why?" is a fetched source or "(unverified)", never a second recalled claim.** It
  rests on the recorded session; a single-turn scenario cannot ask a follow-up.

## Tests

- `test-dating-a-law-for-a-dispute.md`, criteria 1 / 2 / 3 / 4:
  - RED skill arm: Not run
  - RED control arm: 0 / 0 / 0 / 0
  - GREEN round 1: 3 / 3 / 3 / 3
  - GREEN round 2: 3 / 3 / 3 / 3
- `test-citing-a-platform-guideline.md`, criteria 1 / 2 / 3 / 4:
  - RED skill arm: Not run
  - RED control arm: 2 / 0 / 1 / 2
  - GREEN: 3 / 3 / 3 / 3
- `test-reading-feedback-into-a-spec.md`, criteria 1 / 2 / 3 / 4 / 5:
  - RED skill arm: Not run
  - RED control arm: 1 / 3 / 0 / 3 / 3
  - GREEN: 3 / 3 / 3 / 3 / 3

## Iterations

1. **Drafted from the RED runs and the recorded session.** The control arm left out a required element
   from an answer it already gives (a source on some claims, a date on a guideline, the strength of a
   recommendation, the reading of an ambiguous question), so the form is a template with a slot for
   each, not an Iron Law. The jurisdictions' routes moved into `finding-the-law-in-force-on-a-date.md`,
   a procedure read when a law is read at a date.
2. **The pointer to the procedure became an instruction.** In round 1, one law run of three never opened
   the procedure file, never tried the database's JSON gateway, and quoted the 2015 law from secondary
   sites, although it passed every criterion. The sentence that named what the file "carries" became
   "Before the first search for a law of the EU, the UK or Vietnam, read ...". In round 2 all three runs
   opened it and read the gateway.
3. **The fresh-reader check.** A fresh run handed the body asked 29 questions. Two got a sentence: a
   search result's snippet is not a source, and the gateway's `<id>` is the old `ItemID`, found by a web
   search. These stay open, among others: whether the note records the date each source was read; what
   the `Strength` slot holds for a statute, a figure or a study; whether a paywalled primary counts as a
   failed route; whether an archived snapshot is primary; how a directive's national transposition is
   cited; the territorial extent of UK legislation; whether a Vietnamese consolidated text has legal
   effect; and whether the routes reach decrees, circulars and local decisions.
