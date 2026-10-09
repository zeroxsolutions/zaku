# shadcn: building the library

What has to survive a swap of design system: which choices only change CSS variables (one axis each)
and which rewrite component classes (one library each), the colour roles and the text styles the
semantic layer names, and the contrast pairs the code's text is read in.

## In zaku.yaml

```yaml
designSystem:
  shadcn:
    preset: <code> # what the product's `npx shadcn init --preset` took
```

`zaku tokens --css <the stylesheet>` decodes the preset and reads the stylesheet's `:root` and `.dark`
blocks, which hold the values in oklch, converting them to sRGB for Figma and keeping the oklch source.
Without `--css` it refuses, exit 3.

## The preset fields

`npx -y shadcn@4.21.3 preset decode <code>` prints the fields: `style`, `baseColor`, `theme`,
`chartColor`, `iconLibrary`, `font`, `fontHeading`, `radius`, `menuAccent`, `menuColor`.

| Field                                                    | What it changes                                                                                         | In the library                                                                                    |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `style` (nova, vega, maia, lyra, mira, luma, sera, rhea) | component classes                                                                                       | one library per style                                                                             |
| `iconLibrary`                                            | the icon set                                                                                            | the library's icon set page holds this set; another set is another library, as another style is   |
| `baseColor`                                              | CSS variables                                                                                           | a mode in `base-color`                                                                            |
| `theme`                                                  | CSS variables                                                                                           | a mode in `theme`                                                                                 |
| `chartColor`                                             | CSS variables                                                                                           | a mode in `chart`                                                                                 |
| `radius`                                                 | CSS variables                                                                                           | a mode in `radius`                                                                                |
| `font`, `fontHeading`                                    | CSS variables                                                                                           | one mode in `typography`, named for the pair                                                      |
| `menuAccent`                                             | `accent` and `accent-foreground`; bold sets them to primary                                             | a mode in `menu-accent`                                                                           |
| `menuColor`                                              | a class transform on menus: inverted adds the dark class, translucent adds a blurred popover background | inverted is the `semantic` Dark mode on the menu; translucent is a variant of each menu component |

## The axes

| Axis          | Holds                                                                                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `base-color`  | `light/<role>` and `dark/<role>` for every neutral role                                                                                                     |
| `theme`       | primary, primary-foreground, sidebar-primary, sidebar-primary-foreground, and `primary-<n>`: primary at n% opacity, for every opacity a class applies to it |
| `chart`       | chart-1 to chart-5                                                                                                                                          |
| `radius`      | radius sm to 4xl, from the code's radius scale                                                                                                              |
| `typography`  | the sans and heading families                                                                                                                               |
| `menu-accent` | accent and accent-foreground; its bold value aliases primary                                                                                                |
| `project`     | one value per product: tokens a product adds that no preset generates                                                                                       |

A `mode/<name>` token comes from a class pair that takes another role under `dark:`; its description is
the pair.

## Spacing

Tailwind CSS v4 writes `p-<number>` as `padding: calc(var(--spacing) * <number>)`, and the default theme
sets `--spacing: 0.25rem` (Tailwind docs, "padding" and "Theme variables"). So `spacing/<step>` is the
step times 4 px at a 16 px root: `px-2.5` is `spacing/2_5`, 10; `gap-1.5` is `spacing/1_5`, 6. A stylesheet
that sets its own `--spacing` in `@theme` changes the unit. `p-px` is 1 px, `spacing/px`. Each token's
description is `calc(var(--spacing) * <step>)` and the classes that use it.

## The text styles

`typography/<name>` for h1 to h4, p, blockquote, list, inline-code, lead, large, small and muted, from
the typography page of shadcn's docs; each style's description is its classes.

## Contrast

`zaku check` reads each of these pairs in Light and Dark, each needing 4.5:1: foreground on background;
card-foreground on card; popover-foreground on popover; primary-, secondary- and accent-foreground on
their role; muted-foreground on background and on muted; destructive on background; sidebar-foreground
on sidebar; sidebar-primary- and sidebar-accent-foreground on their role; and every `project` token on
background.
