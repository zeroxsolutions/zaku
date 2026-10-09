# Figma: prototyping a flow

What has to survive a swap of drawing tool: connections that mirror the map, overlays for sheets and
dialogs, component states as variants, and transitions recorded as named tokens.

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
