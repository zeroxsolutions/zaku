# Creation Log: choosing-an-interaction-pattern

Written after its RED runs, from what they got wrong and from two failures real sessions recorded.

## Source material

- Jakob Nielsen, "10 Usability Heuristics for User Interface Design", Nielsen Norman Group (published
  1994, reviewed 2024).
- ISO 9241-11:2018, 3.1.1, 3.1.12 to 3.1.15 and the Introduction's Note 2, read from the SIST preview.
- BJ Fogg, behaviormodel.org; roadmap.sh, UX Design roadmap, "CREATE Action Funnel", read from
  github.com/nilbuild/developer-roadmap, `roadmaps/ux-design/content/`.
- RFC 8628, "OAuth 2.0 Device Authorization Grant", sections 5.7 and 6.1.
- Kumar, Saxena, Tsudik and Uzun, "A comparative study of secure device pairing methods", Pervasive and
  Mobile Computing 5 (2009) 734-749, author copy.
- GRADE Handbook, GRADE Working Group, updated October 2013, section 5.
- European Data Protection Board, Guidelines 03/2022 on deceptive design patterns, version 2.0; FTC
  staff report, "Bringing Dark Patterns to Light" (September 2022); Richard H. Thaler, "The Power of
  Nudges, for Good and Bad", New York Times (2015), read from a Wayback copy.
- Chrome for Developers, "Local Network Access" blog post, and the Chrome 147 release notes.

## What was refused

- A pairing-specific skill. The recorded failures were about pairing, but the method (frame, prior
  art, gate, score, weight, record) is the same for a permission ask, an onboarding or a confirmation,
  and a pairing skill would leave those moments with no skill to open.
- A list of recommended patterns per flow. A pattern list is prior art recalled from memory, which is
  the failure the skill exists to prevent; it would also go stale as platforms change.
- An Iron Law and a rationalization table. No run knew the method and skipped it under pressure; every
  RED run produced the wrong shape (an answer first, from memory). The form is a recipe with a record
  template.
- Sourcing rules (primary text, dates, "(unverified)"). Those are `researching-a-claim`'s; this skill
  names it and keeps only what prior art must record.
- Restating the profile's fields. The frame reads them from `profiling-a-product`'s profile and names
  that skill.
- Summing the gate into the weighted score. A total lets convenience points buy back a failed gate.

## What shipped on weak evidence

- "Ease is not a criterion": a real session ranked pairing flows only by "ease", with no audience
  written. RED reproduced it once (control C's "The user doesn't have to pair anything").
- "Prior art before any recommendation": a real session offered a recommendation before reading any
  prior art. RED reproduced it in all three runs, each with no tool call.

## Tests

- `test-choosing-a-pairing-flow.md`: RED failed all six criteria in three of three control runs; GREEN
  round 1 passed all six in two of three runs (one opened its reply on the recommendation), round 2
  passed all six in three of three.

## Iterations

1. Written from the RED failures and the two recorded session failures: the six steps in order, a
   default criteria table with each source's wording, the gate as pass, conditional or fail outside
   the score, weights that name their profile claim, and a record template with certainty per body of
   evidence, open questions and reopen conditions.
2. GREEN round 1 run A read the documents and then put a one-line recommendation above its record.
   "The order" now says the reply opens on the frame and that a summary line above the record counts
   as the first sentence. Round 2 passed.
