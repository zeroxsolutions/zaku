# Test: drawing the documentation components

## Prompt

Each run is `claude -p --model claude-opus-5-5 --tools Read Grep Glob --strict-mcp-config
--disable-slash-commands --no-session-persistence`, with `ENABLE_CLAUDEAI_MCP_SERVERS=false`, from its
own scratch directory, the prompt on stdin. The prompt opens with the line naming the skill's base
directory, then the body without its frontmatter, then "Load no other skill.", and the base directory
is added with `--add-dir`. Then, verbatim:

```
You are building a design library in Figma from a product's code. The product uses Ant Design (antd 6); its badge-like component is Tag and its titled panel is Card. The library file's key is set in docs/design/zaku.yaml, and the library already holds its tokens (semantic colours, radius, spacing) and its text styles. None of the documentation components, and no Tag or Card, is drawn yet.

In this session you cannot reach Figma, so draw nothing. Answer in writing, as the plan you would run:

1. Every documentation component on the documentation components' page, in the order you draw them: for each its exact name, where it stands on the page, its size and layout, every component property (name, type, default value) and what each layer is.
2. When you draw the page header component relative to the Tag and Card entries, and how the header's badge gets there.
3. The component view of the Checkbox entry, whose set has two axes, Checked (false, true) and State (Default, Focus, Invalid, Disabled): every section, and how its variants are labelled, with the exact text of two labels.
```

## Inputs

Everything the run reads is in the prompt and the skill; it reaches no repository and no Figma file.

## Pass criteria

Fixed before the runs, from the documentation frame the user requires.

1. Six documentation components, `DS/Matrix Head` among them, each at x 0 and at y 0, 273, 418, 522,
   812 and 988 in that order.
2. Their properties and defaults: `Eyebrow`, `Component name`, `Show style`, `Definition`;
   `Title` (`Section title`), `Description` (`Section description.`), `Show description`; `Text`
   (`Head`); `Text` (`Cell`) with the variant property `Emphasis`, `primary` and `muted`; `Text`
   (`List item text.`); `Text` (`Prop=value`).
3. `DS/Header` is drawn first, before the Tag, with its badge row empty; the Tag's instance is placed
   into it once the Tag's set exists.
4. The Checkbox component view has a Component section holding the unlabelled set and a Matrix section
   whose table heads its columns with `DS/Matrix Head` reading `State=<value>` and its rows with the
   bare value.

## RED

The skill before this change, three runs.

- 1 failed in 3 of 3: five components, no `DS/Matrix Head`; positions "my choice", "at y 80", "0, 434".
- 2 failed in 3 of 3: `Type=Primary` and `Type=Muted`, `Show badge`, defaults `Property`, `Value`,
  `When to use it.`, `One line on what this section shows.`
- 3 failed in 3 of 3: "The header is drawn after the Tag and Card sets exist"; "`DS/Header` comes
  last, because it holds a Tag instance".
- 4 failed in 3 of 3: labels as TEXT beside the set, "Never `Checked=true` or `State=Disabled`", "There
  is no second grid of instances".

## GREEN

The skill after this change, three runs.

- 1, 2 and 4 passed in 3 of 3: "`DS/Matrix Head`, at y 988", "`Text` TEXT (`Prop=value`)", "four
  `DS/Matrix Head` instances, each 120 wide: `State=Default`, `State=Focus`, ...", "Each row opens with
  a `DS/Table Cell` (`Emphasis=primary`) reading the bare value".
- 3 passed in 3 of 3: "`DS/Header` is the first thing drawn, before the Tag and Card entries, with an
  empty `Badges` frame. It doesn't wait for the Tag." All three then drew Card before Tag, because the
  Tag's Accessibility section is built from Card instances; the skill leaves that order open.

## Measurements

claude-opus-5-5, three runs per arm, two arms (the skill before, the skill after). No control arm: the
measures under test exist only in the skill's reference.

## Limitations

- No run drew on Figma; GREEN on a live file has to show the six components committing in strict mode
  where the reference places them, and the header's badge appearing in every header once placed.
- `Show style` is bound here to the `Badges` frame's visibility; the frame the measures were taken from
  defines the property without binding it.
