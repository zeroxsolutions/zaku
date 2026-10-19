# Test: arranging a new screen across the web targets

## Prompt

Each run is `claude -p "Read prompt.md in this directory and do what it says." --model claude-opus-5-5 --disable-slash-commands` from its own copy of the inputs. The skill arm's `prompt.md` opens with the harness's delivery of a loaded skill, then the task:

```
Base directory for this skill: <skills>/drawing-a-screen

<the body of drawing-a-screen/SKILL.md, without its frontmatter>

Load no other skill.

In this repo the product's design is in docs/design. The Auth feature's Sign in screen, state Default, is about to be drawn for the targets zaku.yaml names. Before anything is drawn, write the layout table that both the drawing and engineering will follow: for each block the map lists, give its horizontal alignment (leading, centred, or full width) and its width on each of the three targets, with one line of reason per decision. Write it to layout.md in this directory. Do not open Figma and change no other file.
```

The control arm's `prompt.md` replaces everything above the task with: `Load no skill, and read no skill file; answer from your own judgement.`

The scratch paths were replaced with placeholders.

## Inputs

`docs/design/zaku.yaml` and `docs/design/map/auth.yaml` as in `test-migrating-a-screens-arrangement.md`,
without the map's `source` line and without a `source/` directory.

## Pass criteria

1. The heading block is centred on all three targets.
2. The closing lines are centred on all three targets.
3. The labels and inputs are leading or full width on all three targets.
4. Each block's alignment is the same on the three targets, or the table names the reason it changes.

## RED

Skill arm, three runs, against the skill before `test-migrating-a-screens-arrangement.md`'s change: all
four criteria passed in all three. "A short welcome over a single narrow form reads as a title block;
the text is centred and wraps inside the column" (run 1); "Secondary text under a centred column
follows the heading's axis" (run 1).

Control arm, three runs: two passed all four. Run 1 failed 1 and 2 and passed 3 and 4, setting every
text block leading: "Field labels are left-aligned, so a leading heading gives the whole form one left
edge to scan down. A centred heading over leading labels would break that edge."

## GREEN

Not run: the skill arm passed every criterion, so no rule was written for this scenario.

## Measurements

Model `claude-opus-5-5`, three runs per arm.

## Limitations

No run drew in Figma, and no native target was in the scenario. The skill arm was handed the body in
the prompt, so this scenario did not show whether a reader reaches the skill unasked; it was not rerun
that way because it licensed no rule.
