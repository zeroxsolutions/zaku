# Test: a first library pass that meets the checker's findings

## Prompt

The recorded run was a fresh `claude -p` session (claude-opus-5-5) with the zaku plugin installed and no
other guidance, in a clean product repository on antd 6.6.5, with an empty Figma file open and the zaku
plugin running in it. The prompt, verbatim:

```
Build our design library in Figma from the code. The product in this repo uses Ant Design (antd 6). The library file is the empty Figma file open right now with the zaku plugin running (it is named "Untitled"). For this first pass: the foundations (the tokens in light and dark, typography, the documentation components, the cover) and the Button component with its documentation views. Use the zaku plugin. Do not ask me questions; decide, and report what you built, where, and what zaku check says.
```

The description runs need no Figma. Each is `claude -p --model claude-opus-5-5 --tools Read Grep Glob
--strict-mcp-config --disable-slash-commands`, with `ENABLE_CLAUDEAI_MCP_SERVERS=false`, from its own
scratch directory, the prompt on stdin. The control arm's prompt opens "Load no skill and read no
skill file; answer from your own judgement." Each skill arm's opens with the line naming the skill's
base directory, then the body without its frontmatter, then "Load no other skill.", and the base
directory is added with `--add-dir` so the references can be read. Then every arm takes, verbatim:

```
You are working in a product repository whose product uses Ant Design (antd 6.6.5). The user gave you this task:

"<the recorded prompt above, verbatim>"

In this session you cannot reach Figma, so draw nothing. Answer in writing, as the plan you would carry out, these five points:

1. What you do before any drawing. Facts: docs/design/zaku.yaml names the design system and has no `figma` section; zaku's get_bridge_state shows one connected file, "Untitled", with one page, "Page 1"; the zaku plugin cannot read the file's key.
2. The pages and frames you create for the Button, and for anything its documentation needs drawn first; where each component set goes, how its variants are laid out, and how its Dark appearance is shown.
3. Your script that creates the text styles ran through zaku's `run_script` in its default mode and returned:
   {"outcome":"rolled-back","reason":"findings","created":["S:2635da26...,","S:da7879a9...,"],"findings":[{"check":"binding","nodeId":"S:2635da26...,","field":"textStyle","message":"typography/h1 (text): text has no library text style"},{"check":"binding","nodeId":"S:da7879a9...,","field":"textStyle","message":"typography/h2 (text): text has no library text style"}]}
   What do you do next, and why?
4. A probe frame you made on "Page 1" with padding 48 and gap 12 (the documentation's measures) came back from `run_script` with "Probe (frame): paddingTop 48 is not a spacing variable" and "itemSpacing 12 is not a spacing variable". How do the documentation frames get their padding and gaps?
5. The lines your final reply to the user carries.
```

Absolute scratch paths were replaced with placeholders.

## Inputs

The product repository held `package.json` (antd 6.6.5, react, vite), `src/main.tsx` (a
`ConfigProvider` around two Buttons), and `docs/design/zaku.yaml` naming the design system and no
Figma file. The Figma file was new, named "Untitled", with one page.

## Pass criteria

Fixed before the description runs, and scored on a drawing run from the file, its transcript and its
reply; on a description run from its answer.

1. Nothing is drawn until `zaku.yaml`'s `figma.library` holds the file's key; no placeholder is written
   there; the reply asks for the file's address.
2. Every library script runs in strict mode; no `mode: "report"`.
3. The text-style finding is shown to be a misreading (the node id is a style, not a text node), that
   change waits, and the reply names it.
4. No variable, text style or component is made for the documentation's measures; documentation keeps
   the reference's numbers.
5. One page per entry, holding the component view and the Guidance view side by side; the entries
   the documentation components need (Tag, Card) are drawn the same way, each whole before the next.
6. Each component set sits inside its component view's demo card, never on the page; its variants
   lie apart, none over another and none cut off by the set's edge.
7. Dark is shown by the page's mode switch over frames painted with the surface token; no second set,
   no copy, no frame pinned to a mode.
8. The reply carries the library key, each entry's page, views and sets, what zaku's `check_rules` over every
   page returned, the misread findings and what was left out.

## RED

The recorded run, on a live file, against the skill before this change. The user stopped it partway.

- 1 failed. The plugin returned no key for the unsaved file, and the run wrote into `zaku.yaml`:
  "The library file has no key yet: it is the unsaved "Untitled" file. Replace both keys once it is
  saved to a project and a product file exists." with `figma: { library: UNSAVED-LIBRARY, product:
  NO-PRODUCT-FILE }`, then drew. `zaku library save` and the recipe comparison could not run.
- 2 failed. Three scripts ran with `mode: "report"`: a probe frame "to see what check flags", the
  text styles, and a slot probe. Of the text styles it said: "Check misreads the new text styles as
  unstyled text nodes (a false positive), so I'm creating them in report mode."
- 3 failed, and the finding was a real misreading. The strict run that created eighteen text styles
  returned eighteen findings, each naming a style id (`S:<hash>,`) as "(text): text has no library
  text style". The sandbox recorded every object a `create*` call returned, `createTextStyle` included,
  and a text style's type is `TEXT`, so the snapshot read each style as an unstyled text node. The run
  said "a false positive" without naming why, and kept the batch in report mode instead of reporting
  it.
- 4 failed. After the probe: "Check flags raw padding, gaps and unstyled text, so the documentation
  gets its own hidden spacing variables and `DS/` text styles." It created eighteen `docs/space/<n>`
  and `docs/radius/<n>` variables with empty scopes in the `semantic` collection, and nine `DS/` text
  styles described "Documentation text, not a product style".
- 5 failed. It created the pages (`Thumbnail`, `Component for Docs`, the dividers, `Icon`,
  `Typography`, `Button`, `Card`, `Tag`, each entry page with U+2756), then drew the Tag and the Card
  sets with no component view and no Guidance frame. The Button was never reached. Drawing Tag and
  Card first is the order the skill gives; drawing them bare was not.
- 6 failed. The four Card variants were created by one script and left stacked at one position before
  they were combined, so their labels printed over each other on the canvas. The Tag set was laid out
  as a wrapping row and then given `resize(1000, 100)`; it stayed 100 high and cut its second row off.
  The Card was drawn over the Tag set on the canvas the user saw. Both sets were children of their
  page, outside any view.
- 7 failed in the user's eye. Half the Tags were near invisible: they were the Light Disabled variants,
  whose fills are translucent, standing on the editor's dark canvas with no frame painted with the page
  surface behind them. No Dark copy was drawn and no frame pinned a mode.
- 8 not reached.

### Description runs, control arm (no skill)

- 1 failed in 3 of 3. Each wrote a `figma` section with the key left empty and drew: "I'd leave the
  key field empty with a note. I would not make up a key or a URL".
- 2 failed in 2 of 3: "I'd look in `execute`'s schema for the mode meant for creating foundations
  (styles and variables) and run the same script in that mode." The third stayed in strict mode.
- 3 failed in 3 of 3. One read the findings as "a real configuration gap" (the file not declared as the
  library); two called them a false positive and planned another mode.
- 4 failed in 3 of 3: no variable made for documentation, but every documentation padding bound to
  antd's spacing tokens, "12 is `paddingSM` and 48 is `marginXXL`".
- 5 and 6 failed in 3 of 3: pages by foundation, the Button set "in its own frame at the top" of its
  page, documentation views below it.
- 7 failed in 3 of 3: "a Light frame, and a Dark frame with the variable mode set to Dark".
- 8 passed in part in 3 of 3: what was built, check output quoted, the missing key named.

### Description runs, the skill before this change

- 1 failed in 3 of 3: "I'd draw through `execute` on the connected "Untitled" file and record the
  missing key as something the user has to supply"; "I don't stop to ask about the missing `figma`
  section or file key."
- 2 failed in 3 of 3: "Run only the style-creation script in the mode meant for creating foundations";
  "Rerun the same script in that mode"; "re-run that one script in the `execute` mode that commits
  despite findings".
- 3 failed in 3 of 3: each saw that `S:` ids are styles ("a text style can't itself "have a library text
  style""), then kept the change in another mode.
- 4 failed in 3 of 3: two created a `docs` collection, "`space/8, 10, 12, 16, 20, 24, 32, 40, 48, 64,
  96, 120` and `radius/8, 14`", hidden from publishing; the third kept the reference's numbers but "If
  zaku still flags their spacing, I commit them in the non-gating mode".
- 5, 6 and 7 passed in 3 of 3: the reference's pages, the two frames per entry, the set inside `Preview`
  or `Matrix`, no frame pinning a mode.
- 8 failed in 3 of 3: no key, so "`zaku check`: not run", and no line naming the misread finding's node.

## GREEN

One run on a live file, the library's address given in the prompt, against the skill with the checker and spacing changes in.

- 1 passed: the key went into `zaku.yaml` from the address. But the schema required `figma.product`
  too, and the run, having no product file, created one in the user's team with the Figma MCP
  server's `create_new_file`, a file nobody asked for. The schema and step 0 are fixed since.
- 2, 3 and 4 passed: seven `execute` calls, none in report mode; no variable or style made for
  documentation; it stopped on a misread and named it: "naming "Component keeps a default name" on
  node 2:215. That node is a FRAME named "Component": the Component section the zaku reference
  requires in every component view". The checker read any layer named `Component` as a default name;
  it now reads a name as a default only on the node type Figma gives it to.
- 5, 6 and 7 not reached: the Tag entry waited on the checker fix, and everything after it.
- 8 passed: the five lines, the misread finding with its node id and what waits on it.

### Description runs, the skill after this change

- 1 passed in 3 of 3: "So I draw nothing in Figma, and I don't write a placeholder key into
  `zaku.yaml`. You asked me not to ask questions, but the key isn't something I can decide."
- 2 passed in 3 of 3: "No rerun in `mode: "report"`, which would keep the whole batch along with every
  finding."
- 3 passed in 3 of 3: each named both ids as the text styles `typography/h1` and `typography/h2`, called
  it a checker defect, and held back the text styles and what needs them.
- 4 passed in 3 of 3: "Documentation frames take the reference's measures as plain numbers ... never
  create spacing variables for them, because a hidden variable still ships". All three also read the
  probe's finding as correct, because "Page 1" is not a page the reference names.
- 5, 6 and 7 passed in 3 of 3: Tag and Card first, each entry whole with its check before the next,
  every node given a parent on its page by name, the set made inside the demo card or `Matrix`, no Dark
  copy and no pinned mode.
- 8 passed in 3 of 3: each wrote the five REQUIRED lines, `Library file: none` with the address asked
  for.

## Measurements

- Recorded run: claude-opus-5-5, one session, stopped by the user.
- Description runs: claude-opus-5-5, three runs per arm, three arms, one fresh `claude -p` each.

| Criterion                                         | Control | Skill before | Skill after |
| ------------------------------------------------- | ------- | ------------ | ----------- |
| 1 key before drawing                              | 0/3     | 0/3          | 3/3         |
| 2 strict mode only                                | 1/3     | 0/3          | 3/3         |
| 3 misreading shown and held                       | 0/3     | 0/3          | 3/3         |
| 4 no variable for documentation, its numbers kept | 0/3     | 0/3          | 3/3         |
| 5 page per entry, both views, each whole          | 0/3     | 3/3          | 3/3         |
| 6 set inside the demo card, variants apart        | 0/3     | 3/3          | 3/3         |
| 7 Dark by the mode switch                         | 0/3     | 3/3          | 3/3         |
| 8 the reply's lines                               | 0/3     | 0/3          | 3/3         |

## Limitations

- GREEN on a live file needs a Figma file with the zaku plugin open, which only the user can provide.
  It has to check: the run stops at step 0 without a key and asks for the address; with the key, no
  `mode: "report"` in any script; the text styles commit in strict mode with no finding; no `docs/` or
  `DS/` variable or style; each entry page holds `<Style> / <Entry>` and `<Style> / <Entry> /
  Guidance`, the set inside the first one's demo card; a forced overlap and a set left on the page are
  refused by `execute` as `overlap` and `placement`; the Disabled Tags read on the view's surface in
  Light and in Dark; the reply carries the REQUIRED lines.
- The skill before this change already passed 5, 6 and 7 in its description runs, yet the recorded run
  drew bare sets: knowing the shape was not the failure, drawing out of order was. The order of drawing
  an entry and the `placement` and `overlap` checks answer that, and only a drawing run measures them.
- The description runs measure what a reader plans, not what it draws under a checker's pressure; the
  recorded failures happened after many tool calls, which no description run reproduces.
- The canvas the user photographed mixed the Card and Tag pages' contents; the transcript does not show
  how the Card's components reached the page the user had open. The reference's line on
  `figma.currentPage` answers that mechanism, not a reproduced run.
