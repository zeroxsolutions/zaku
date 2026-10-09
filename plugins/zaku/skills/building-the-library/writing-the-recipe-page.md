# Writing the recipe page

`zaku recipe` cannot know how the code builds a variant, so the product renders every variant on one
page and marks what it rendered. Open this file when the product has no recipe page, or when a
component, a variant prop or a part is added to the code.

## What the page renders

- One element per variant: every library component, in every value of every variant prop, crossed with
  every other prop's values, as the library's variants are. A variant the page leaves out is reported
  as a library variant the code does not have.
- A state the code styles on a prop or an attribute (disabled, invalid, checked, open) is rendered with
  that prop. A state it styles only on interaction (hover, focus-visible, active) is rendered with the
  pseudo-class forced, below.
- The page is a route only the development server mounts, so the product never ships it. Its URL is
  `recipe.url` in `zaku.yaml`; `--url` overrides it for a server on another port.

## How it marks them

| Attribute             | On                         | Holds                                                                          |
| --------------------- | -------------------------- | ------------------------------------------------------------------------------ |
| `data-zaku-component` | the variant's root element | the library component's name, `Button`                                         |
| `data-zaku-props`     | the same element           | the variant's props as JSON, named and valued as the code names them           |
| `data-zaku-part`      | an element inside the root | the code part, as the component's `parts:` line names it                       |
| `data-zaku-force`     | the root, when needed      | `hover`, `focus`, `focus-visible`, `focus-within` or `active`, space-separated |

```html
<button data-zaku-component="Button" data-zaku-props='{"variant":"outline","size":"sm"}'>
  <svg data-zaku-part="icon"></svg><span data-zaku-part="label">Save</span>
</button>
<button
  data-zaku-component="Button"
  data-zaku-props='{"variant":"outline","size":"sm","state":"hover"}'
  data-zaku-force="hover"
>
  <svg data-zaku-part="icon"></svg><span data-zaku-part="label">Save</span>
</button>
```

- The root is the part `root`; it needs no `data-zaku-part`.
- A part belongs to the nearest root above it, so a component placed inside another is read as its own
  variant and its parts stay out of the outer one.
- A props key the library does not map is matched by nothing: the component's `props:` line maps each
  design property to the key written here.

## Light and dark

zaku reads the page as served for light. For dark it adds `recipe.darkClass` (`dark` by default) to
the root element, or, with `recipe.dark: media`, emulates the dark colour scheme:

```yaml
recipe:
  url: http://localhost:4200/zaku/recipe
  dark: class # or media
  darkClass: dark
```

## Running it

`zaku recipe` loads Playwright from the product's dependencies and writes `docs/design/recipe.json`.

| Exit | Means                                                                                                                                                                                                |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | written; the line names the components and variants read                                                                                                                                             |
| 2    | the page could not be read: it marks nothing, a props value is not JSON, a variant is rendered twice, a colour is in a form zaku does not read, or a state cannot be forced; the message names which |
| 3    | no URL, or no Playwright in the product                                                                                                                                                              |
