# Figma: prototyping a flow

What has to survive a swap of drawing tool: connections that mirror the map, overlays for sheets and
dialogs, component states as variants, and transitions recorded as named tokens.

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

## The prototype page

Figma connects frames only inside one page: "Prototypes in Figma are currently limited to single
pages" (Figma, "5 ways to level up your prototyping workflow"), and a page lists only its own flows
(Help Center, "Create and manage prototype flows"). Figma's own page skeleton keeps a Prototype page
apart from the flow, because "Prototypes need duplicated screens for animation, which confuses
stakeholders if it's mixed into the flow page" (Figma, "Team, folder, and file organization").
The Open link action is no way between pages: "When you click on an Open link hotspot, the link opens
in a new tab" (Help Center, "Prototype actions").

- The page is `<target name> prototype` (`iOS phone prototype`), after the last feature page, behind a
  divider page named `---`.
- Rebuild: remove every frame on it, then for each feature page in the maps' order `frame.clone()`
  every top-level frame whose name ends ` / <target name>`, append the clone to the prototype page,
  and lay the screens top to bottom with their states left to right. A clone keeps its name and its
  instances stay linked to their components.
- A clone keeps the reactions of its source. Clear them with `setReactionsAsync([])` on every node
  that has any, then wire from the maps, so no connection points back at a feature page.
- `findOne` and `findAll` on a fresh clone can miss what a slot holds; walk `children` of every node,
  SLOT nodes included, to find a control.

## Connections

- `page.flowStartingPoints` is a list of `{ nodeId, name }`; set it with each root's first-state frame
  on every target, named `<title> / <target name>`.
- `node.setReactionsAsync([{ trigger: { type: 'ON_CLICK' }, actions: [{ type: 'NODE', destinationId,
  navigation: 'NAVIGATE', transition, preserveScrollPosition: false }] }])` adds a connection. `navigation`
  is `NAVIGATE`, `OVERLAY`, `SWAP` or `SCROLL_TO`; the Back action is `{ type: 'BACK' }` and closing an
  overlay `{ type: 'CLOSE' }`.
- A reaction on a main component is inherited by its instances.
- A sheet, a dialog or a menu opens with `navigation: 'OVERLAY'`. The overlay frame's
  `overlayBackgroundInteraction` (`CLOSE_ON_CLICK_OUTSIDE`) and `overlayPositionType` are read-only in
  the Plugin API, so a person sets them in the prototype panel; the reply lists each overlay frame.
- A component's own states change with a reaction on its variant (an action `{ type: 'NODE',
  destinationId: <variant id>, navigation: 'CHANGE_TO' }`) and a `SMART_ANIMATE` transition: hover is
  trigger `ON_HOVER` and pressed `ON_PRESS`, each of which Figma reverts when the pointer leaves or
  lifts.
- What Figma cannot draw is written in a Section named `Motion`, 400 to the right of the screen's
  Section, holding one text layer per transition in the skill's line format.

## Figma's Motion is not a transition

Figma's Motion (in beta in the Plugin API: `figma.motion`, `node.applyAnimationStyle`, manual keyframe
tracks, `node.timelines`) keyframes a node on the timeline of the top-level frame that holds it. It
plays when that frame shows, whichever connection led there, and keyframes on a component play in every
instance, which the API cannot remove one by one ("Cannot write animations to instance sublayers"). So a
screen change, an overlay and a component's state change are reactions with a `transition`, below, and
never keyframes. Keyframes go only on a variant whose state moves by itself (a Spinner turning, a
Skeleton's shimmer). A motion that answers the pointer, such as an icon's hover, goes on its own
`State=Hover` variant, which an `ON_HOVER` `CHANGE_TO` with no transition reaches, so the `Default`
variant every page places stands still.

## Transitions

A transition is `{ type, easing: { type }, duration }` with `duration` in seconds. `DISSOLVE`,
`SMART_ANIMATE` and `SCROLL_ANIMATE` take no direction; `MOVE_IN`, `MOVE_OUT`, `PUSH`, `SLIDE_IN` and
`SLIDE_OUT` take `direction` (`LEFT`, `RIGHT`, `TOP`, `BOTTOM`) and `matchLayers`. One transition has
one easing, so it takes the entering pair. The patterns draw as:

| Pattern                           | Figma transition                                                                |
| --------------------------------- | ------------------------------------------------------------------------------- |
| container transform               | `SMART_ANIMATE`, the tapped element and the next screen's container named alike |
| shared axis x                     | `SLIDE_IN`, `direction: 'LEFT'` forward                                         |
| shared axis y                     | `SLIDE_IN`, `direction: 'TOP'`                                                  |
| shared axis z, fade through, fade | `DISSOLVE`                                                                      |
| a native push                     | `PUSH`, `direction: 'LEFT'`; the Back action reverses it                        |

Figma has no real container transform and no shared element, so the `Motion` Section says what the
code does.

A cubic token is a `CUSTOM_CUBIC_BEZIER` easing in Figma with its four values. `emphasized` is not a cubic
curve, so Figma and CSS `cubic-bezier()` can only approximate it; the frame uses `standard` and the
`Motion` Section names `emphasized`.
