# Creation Log: profiling-a-product

Written after its RED runs, from what they got wrong and from three failures real sessions recorded.

## Source material

- roadmap.sh, UX Design roadmap, the "Understanding the Product" branch (Target Actor, Target Action,
  Target Outcome, Lean Canvas) and the behaviour nodes (BJ Fogg's Behavior Model, CREATE Action
  Funnel, Nir Eyal's Hook Model), read from github.com/nilbuild/developer-roadmap,
  `roadmaps/ux-design/content/`.
- Ash Maurya, "What is Lean Canvas" (2024) and "What is the Right Fill Order for a Lean Canvas?"
  (2019).
- David J. Bland, "Assumptions Mapping", Strategyzer (2020).
- Stephen Wendel, "Designing for Behavior Change", 2nd ed., O'Reilly, 2020: the table of contents of
  chapters 6 and 7. The text itself was not readable.
- BJ Fogg, behaviormodel.org.
- Nielsen Norman Group: "Personas Make Users Memorable for Product Team Members" (2025), "3 Persona
  Types" (2020), "Usability for Older Adults: Challenges and Changes" (2019), "The Distribution of
  Users' Computer Skills" (2016).
- Burnett et al., "GenderMag", Interacting with Computers 28(6), 2016; gendermag.org; GOV.UK Design
  System, "Equality information".
- Hofstede, "6-D model of national culture"; W3C, WCAG 2.2; W3C WAI, "Older Users and Web
  Accessibility"; Microsoft Inclusive Design toolkit (2016).
- ISO 9241-11:2018, 3.1.15 "context of use", read from the SIST preview.
- Android Developers, "Use window size classes" (the five width classes and their dp breakpoints).
- StatCounter, FAQ (page views, the 45-day revision window).
- Regulation (EU) 2016/679, Article 3 and Recital 23; EDPB Guidelines 3/2018 on territorial scope,
  version 2.1.

## What was refused

- A machine-readable `profile.yaml` with a schema. No checker reads the profile, and a schema with no
  reader adds a file to keep in step and nothing that fails when the profile is wrong. The profile is
  Markdown tables until a check needs it as data.
- Business Model Canvas, Value Proposition Canvas and Jobs to be Done as further required sections.
  Lean Canvas carries customer, problem and metric blocks the runs lacked; the Segments table's goal
  line carries the job in its circumstance. A second canvas is a second answer to the same rows.
- An Iron Law and a rationalization table. No run knew the rule and skipped it; every RED run produced
  the wrong shape, a brief with a draft flow. The form is a recipe with required slots.
- A rule on how to source a fact (primary text, dates, "(unverified)"). That is `researching-a-claim`'s;
  this skill names it and keeps only the Status column.
- A list of laws per market. Which law applies is a legal reader's conclusion on a dated text; the
  profile records only the facts that make a law worth reading.

## What shipped on weak evidence

- "Every runtime is a row, and a desktop browser is not native desktop": a real session repeated "the
  web covers desktop" as settled, treating a width class as a platform. RED reproduced the omission
  (no run named native desktop), not the sentence itself.
- "Every trait cites a source or is an assumption": a real session proposed segment traits with no
  source. RED reproduced it in all three runs.
- "A decision names the profile entries it rests on": a real session ranked pairing flows only by
  "ease", with no audience written. This scenario does not exercise a decision against an existing
  profile, so that paragraph shipped on the recorded failure alone.

## Tests

- `test-preparing-the-design-of-a-new-app.md`: RED failed all eight criteria in three of three control
  runs; GREEN round 1 passed seven of eight in three of three runs (criterion 3 failed in all), rounds
  2 and 3 passed eight of eight in three of three each.

## Iterations

1. Written from the RED failures and the three recorded session failures: the profile as the only
   deliverable, its tables as required slots, a Status column on every row, twelve runtime rows, three
   market lists, and a legal table that names and does not conclude.
2. GREEN round 1 left the action and outcome rows "Unknown" in every run, reading "a row the team
   cannot fill stays, marked assumption" as permission to leave it empty. The body now requires a best
   guess stated as a claim, from Maurya's "best guess" and Bland's "We believe that ...", and a likeliest
   target action with its metric where the brief names none. Round 2 passed.
3. The Business paragraph still quoted Maurya's "it's okay to leave boxes blank", which contradicted
   iteration 2. It now names the unfair advantage as the one block left empty, written "none yet".
   Round 3 passed.
