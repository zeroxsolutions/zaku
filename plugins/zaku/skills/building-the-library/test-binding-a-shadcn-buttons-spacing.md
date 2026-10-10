# Test: binding a shadcn Button's spacing

## Prompt

Each run is `claude -p --model claude-opus-5-5 --tools Read Grep Glob --strict-mcp-config
--disable-slash-commands`, with `ENABLE_CLAUDEAI_MCP_SERVERS=false`, from its own scratch directory, the
prompt on stdin. The prompt opens with the line naming the skill's base directory, then the body without
its frontmatter, then "Load no other skill.", and the base directory is added with `--add-dir`. Then,
verbatim:

````
You are working in a product repository whose design system is shadcn (style nova, Tailwind CSS v4). Its Button lives in src/components/ui/button.tsx; its size variants read, verbatim:

```
size: {
  default: 'h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
  xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs ...",
  sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] ...",
  lg: 'h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
}
```

src/app/global.css imports tailwindcss and sets no `--spacing` of its own. The library file's key is in docs/design/zaku.yaml, and the library already holds the token collections the skill names, with no spacing variables.

You are drawing the library's Button. Your script that creates its 192 variants ran through zaku's `run_script` in its default mode and returned `"outcome": "rolled-back", "reason": "findings"`, with findings such as:

  "Variant=default, Size=default, State=Default (component): paddingLeft 10 is not a spacing variable"
  "Variant=default, Size=default, State=Default (component): itemSpacing 6 is not a spacing variable"
  "Variant=default, Size=xs, State=Default (component): paddingLeft 8 is not a spacing variable"

In this session you cannot reach Figma, so draw nothing. Answer in writing: what do you do next, and why? If the library should hold anything new, name each item exactly (names, values, descriptions, scopes), and say where its values come from. Then say how a product screen drawn later from this library gets a gap of 20.
````

Absolute scratch paths were replaced with placeholders.

## Inputs

Everything the run reads is in the prompt; it reaches no repository and no Figma file.

## Pass criteria

Fixed before the runs.

1. The run stays in strict mode and treats the findings as true, not as a misreading.
2. The library gains one token per spacing step, named as the skill names them, each value the step times
   4 px, its description the formula, its scope the padding and gap fields; no name Figma refuses.
3. Every padding and gap of the Button is bound to those tokens; nothing is left raw.
4. A gap of 20 on a later screen binds the token for step 5, added to the library if missing.

## RED

The skill before this change, three runs.

- 1, 3 and 4 passed in 3 of 3: "The findings are true"; "add the code's spacing scale to the library as
  variables, bind every padding and gap"; "The designer binds the frame's gap to `spacing/5`".
- 2 failed in 3 of 3. Each found the skill silent and proposed its own shape: "Neither the skill nor
  `references/figma.md`/`shadcn.md` covers spacing, so the name, collection and scopes below are my
  proposal". The names differed: `spacing/1_5` with "I believe Figma rejects `.` in variable names, but
  haven't confirmed it"; `spacing/1.5`, which Figma refuses; and a fixed list of thirty-three steps
  "`0.5 1 1.5 2 2.5 3 ...`" whatever the code uses.

## GREEN

The skill after this change, three runs.

- 1, 3 and 4 passed in 3 of 3.
- 2 passed in 3 of 3: `spacing/1`, `spacing/1_5`, `spacing/2`, `spacing/2_5`, values 4, 6, 8, 10, each
  `FLOAT` in `semantic`, scope `GAP`, its description `calc(var(--spacing) * <step>)` and the classes
  that use it; "A `.` in a step is written `_`, because Figma refuses `.` in variable names"; one token
  per step the components and demos use, read from the code.

## Measurements

claude-opus-5-5, three runs per arm, two arms (the skill before, the skill after). No control arm: the
behaviour under test is the shape the skill gives, which a reader with no skill has no library layer to
put in.

## Limitations

- No run drew on Figma; GREEN on a live file has to show the Button committing in strict mode with every
  padding and gap bound to a `spacing/` token, and a Figma name with `_` accepted.
- Figma's refusal of `.` in a variable name rests on Figma's community forum, not its Help Center.
