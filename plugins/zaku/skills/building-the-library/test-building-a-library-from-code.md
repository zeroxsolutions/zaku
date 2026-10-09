# Test: building a library from its code

## Prompt

The run is `claude -p "Read prompt.md in this directory and do what it says."` from its own copy of the
inputs, with only the Figma MCP server connected (`--strict-mcp-config`, and
`ENABLE_CLAUDEAI_MCP_SERVERS=false` so a claude.ai Figma connector does not shadow it), and `prompt.md`
holds, verbatim, with `<bench file>` the key of the bench's scratch Figma file:

```
Use only the guidance the Figma MCP server gives, and read no skill file; answer from your own judgement.

This repo's design system is shadcn, configured by components.json, with its tokens in src/app/global.css, its font in src/app/layout.tsx and its components in src/components/ui. Build its library in Figma, in the file <bench file>, on pages whose names start with "zaku run": the tokens, the text styles, the icons and the Button the code defines, so a designer can draw screens from it that match the code. Touch no other page. Then tell me what you built and what you left out.
```

The skill arm adds the skill's directory and `Use the zaku skill building-the-library` in place of the
first line.

## Inputs

Every run's directory holds `components.json` (style `base-nova`, base colour `zinc`, icon library
`lucide`), `package.json` (lucide-react 1.40.0), `src/app/global.css` (the tokens under `:root` and
`.dark`, in oklch), `src/app/layout.tsx` (the font, Inter) and `src/components/ui/button.tsx` (the
Button's cva recipe: six variants, eight sizes). The product's name was replaced with a placeholder.

## Pass criteria

Fixed before the first run, and scored from the run's saved library (read as data, no drawing-tool
call), its transcript and its reply. The answer key is the code: each oklch token converted to sRGB,
each Tailwind class converted to pixels at a 16 px root. The layout criteria follow the skill's parts and
views, taken from the team's Figma library, which the run never sees; every name and place is scored
as the skill's Figma reference spells it.

1. Tokens: the axes and the semantic layer the skill names, held as the tool's reference holds them
   (collections and modes); every `:root` and `.dark` colour
   resolves to the code's value, each sRGB channel within 1/255.
2. Every opacity and dark-mode pair the Button's classes use is a `semantic` variable
   (`color/destructive-10`, `color/primary-80`, `color/ring-50`, `mode/button-outline-bg` and the rest),
   and no Button item holds a raw colour.
3. The parts, in order and placed as the tool's reference places them: the cover, the documentation
   components, the icon set, the Button entry holding only its component and its two views.
4. The six documentation components exist, named as the reference names them, each taking what the
   skill's table says, and both Button views are built from their instances.
5. The Button has a variant for every variant (6), size (8) and state (Default, Hover, Focus,
   Disabled): 192, named as the reference names a variant and laid out as a grid labelled by size and
   by variant and state; a designer can change its label, hide each icon and swap each icon on an
   instance, by the reference's means; its description maps each property to its prop.
6. Each variant's height, horizontal padding, gap, radius, label size and weight, fill, border and label
   colour match its classes, in Light and in Dark, within 0.5 px and 1/255.
7. The Guidance frame holds Anatomy, Variants, Sizes, Composition, Properties, Usage, Behavior &
   content, Accessibility and Preview, in that order; the Properties table has a row per property; the
   class names in Anatomy and Behavior are in `button.tsx`; Preview shows Dark by the reference's means.
8. The icon set is one component per icon named `lucide/<name>`, 16 px, each description naming the
   React export and the size class.
9. The cover is 1200 x 675, sets no mode of its own, and holds instances of the library's components.
10. The reply names what it left out and claims nothing the saved library contradicts, and no other
    open document changed during the run.

## RED

Not run.

## GREEN

Not run.

## Measurements

## Limitations

- The main session's own build of the same library is the reference the probe was checked against; it
  is not a run.
