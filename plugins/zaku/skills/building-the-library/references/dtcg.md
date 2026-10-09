# DTCG: building the library

What has to survive a swap of design system: the axes a product chooses on, the colour roles and radius
steps the semantic layer names, the text styles, and the contrast pairs the code's text is read in.
This reference spells them for a design system that exports its tokens in the Design Tokens Format
Module 2025.10, with or without its Resolver Module.

## In zaku.yaml

With a resolver document, each scheme names the context it picks on each modifier:

```yaml
designSystem:
  dtcg:
    resolver: tokens/resolver.json
    light: { theme: light }
    dark: { theme: dark }
    colors: color # the group whose tokens are the colour roles; color by default
    radii: radius # the group whose tokens are the radius steps; radius by default
    contrast: # foreground and background token paths a text is read in
      - [color.text, color.surface]
```

Without one, each scheme lists its token files, merged in order, a later file winning:

```yaml
designSystem:
  dtcg:
    light: [tokens/base.json, tokens/light.json]
    dark: [tokens/base.json, tokens/dark.json]
```

File paths are from the repository root; a `$ref` inside the resolver is from the resolver's own
folder. `zaku tokens` takes no `--css` here. It resolves every alias, refuses one it cannot reach or a
cycle by naming the token, and converts each colour (sRGB, oklch or a hex) to sRGB; a token in another
colour space is refused by name, and a radius in rem is read at 16 px.

## The axes

| DTCG                                                            | In the library                                                                              |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| a resolver modifier other than the one that picks Light or Dark | an axis, its contexts the modes                                                             |
| the modifier that picks Light or Dark                           | the `semantic` collection's Light and Dark                                                  |
| sets                                                            | the tokens every axis value starts from; no collection of their own                         |
| no resolver                                                     | no axis: the `semantic` collection's Light and Dark hold the values the two file lists give |
| a token the product adds                                        | a mode in `project`                                                                         |

## The semantic layer

| DTCG                                                                               | Semantic token                                                                                     |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| a token under the `colors` group, `color.brand.on`                                 | `color/brand/on`: the path after the group, `.` read as `/`                                        |
| a token under the `radii` group                                                    | `radius/<step>`, in px                                                                             |
| a `dimension` token under a `spacing` group                                        | `spacing/<step>`, in px, the path after the group as its step                                      |
| a component token whose alias differs between Light and Dark (`button.outline.bg`) | `mode/<name>`, `button-outline-bg`, its description the two aliases                                |
| an alias, `{palette.green}`                                                        | a variable alias to the variable that token is, never its resolved value                           |
| a `typography` composite token                                                     | a text style `typography/<name>`, its parts bound to the family, size and weight tokens it aliases |

`tokens.json` keeps each colour's alias as its source, so the library's variable points where the
token points.

## Contrast

A DTCG file says nothing about which colour is read on which. `zaku check` takes the pairs from
`designSystem.dtcg.contrast` and reports contrast as not run while that list is empty; a path it cannot
find under the `colors` group is a finding.
