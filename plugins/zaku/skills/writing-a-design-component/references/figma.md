# Figma: writing a design component

What has to survive a swap of drawing tool: a component is its variants named as the code names them,
its content regions are filled by a designer, its mapping lines travel with it, and it lives with its
feature until a second feature needs it.

## Reaching the file

A run reaches the file through zaku's MCP server, which drives the zaku plugin open in the file, or
through Figma's MCP server:

| Step          | zaku's server                  | Figma's server                                                                                        |
| ------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Write         | `run_script`, `mode: "strict"` | `use_figma`, then the rules script for the page written                                               |
| Check a page  | `check_rules`, `scope: "page"` | `zaku rules script --page <page>` through `use_figma`, its answer read by `zaku check --input <file>` |
| Render a node | `get_screenshot`               | `get_screenshot`                                                                                      |

Strict mode rolls a finding back; `use_figma` keeps every write, so over Figma's server a finding is
fixed in the next write.

## Making the set

- Draw each variant as a `ComponentNode` (`figma.createComponent()` or `figma.createComponentFromNode`),
  named `<Axis>=<value>` for every axis, comma separated, in the code's order with State last
  (`Variant=default, Size=sm, State=Hover`), then `figma.combineAsVariants(components, parent)`. The
  set's name is the root's name.
- The properties: a variant axis is `VARIANT`, a part shown or hidden is `BOOLEAN`, an icon is
  `INSTANCE_SWAP` with the library's icons as preferred values, a content region is `SLOT`, a fixed
  label is `TEXT`. `component.addComponentProperty(name, type, default)` adds one; read
  `componentPropertyDefinitions` on the set, never on a variant.
- `component.createSlot()` makes a slot inside a component (slots are generally available since the
  Plugin API update of 2026-06-10); `SlotSettings` sets `minChildren`, `maxChildren` and preferred values.
- `node.description` holds the `code:`, `props:` and `parts:` lines, on a component or a set only.

## Pages

- In the product file, a kind's page is `<kind> / <Component>`, one page per component. Pages are not
  nested in Figma, so the kinds follow each other in the skill's table order, each kind's pages
  alphabetical, with a page named `---` between kinds, which the pages panel draws as a divider. The
  library file names its pages its own way (`building-the-library`); the two files never share a
  page.
- A component one feature uses lives in a Section named `_components` on that feature's page, with its
  `<Component>` and `<Component> / Guidance` frames beside it in the same Section.
- A component's page holds a `<Component>` frame (a `DS/Header` instance and the component set) and a
  `<Component> / Guidance` frame, as the library's component pages do.
- zaku's checks read a node on a `<kind> / <Component>` page, or in a `_components` Section, as
  documentation unless a component or a component set holds it, and leave its padding, gaps and text
  style to the documentation's measures; its paints are still held. A screen on a feature page is
  held to every rule.

## Moving

`newPage.appendChild(componentSet)` moves a main component to another page in the same file, and its
instances stay connected.
