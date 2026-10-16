# Figma: drawing a screen

What has to survive a swap of drawing tool: frames sit in Sections by screen and state, hold instances
of published components, and change those instances only through their properties.

## Reaching the file

A run reaches the file through zaku's MCP server, which drives the zaku plugin open in the file, or
through Figma's MCP server. Each step is one call either way:

| Step              | zaku's server                  | Figma's server                                                                                                      |
| ----------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Write a state     | `run_script`, `mode: "strict"` | `use_figma`, then the rules script for the page written                                                             |
| Check a page      | `check_rules`, `scope: "page"` | `zaku rules script --page <page>` run through `use_figma`, its answer saved and read by `zaku check --input <file>` |
| Read nodes        | `read_nodes`                   | `use_figma` returning what it read                                                                                  |
| Render a frame    | `get_screenshot`               | `get_screenshot`                                                                                                    |
| Bring an image in | the steps under Images         | the steps under Images                                                                                              |

`run_script` rolls a write back when the rules find something; `use_figma` keeps it, so over Figma's
server the run fixes each finding in a further write. The rules script switches to the page it is
given with `setCurrentPageAsync`; `use_figma` starts every call on the first page and refuses
`loadAllPagesAsync`, so a run checks one page per call. Its answer gives the total and the count per
check, and as many findings as fit the reply; `zaku check --input` names each check whose findings it
left out. `check_rules` answers the same way: `total` and `counts` cover every finding, and `cut` says
the list stops short, so the run fixes what it lists and checks again until `total` is 0.

## Sections

A Section is `figma.createSection()`, named with `.name`. A screen Section contains its state Sections,
and a state Section contains its frames. Frames inside a Section keep their own coordinates relative to
it. A Section has no auto layout, so the script places everything: 80 inside each Section's edge,
frames left to right 160 apart, state Sections top to bottom 240 apart, screen Sections top to bottom
400 apart, and each Section resized to hold what it contains.

## Library instances

- `await figma.importComponentSetByKeyAsync(key)` or `importComponentByKeyAsync(key)` brings a published
  component in; `.createInstance()` places it. Keys come from the library snapshot, `docs/design/library.json`, which `zaku library save` writes.
- `instance.setProperties({ 'Variant': 'outline', 'Label#12:0': 'Save' })` changes properties. Text
  properties carry a `#id` suffix in their key; read `componentProperties` for the exact keys.
- Setting an `INSTANCE_SWAP` property swaps the nested instance, even to the icon it already shows, and
  the swapped glyph paints in the icon component's colour instead of the variant's. Set it only to
  change the icon; a glyph a swap left in another colour is a `binding` finding naming the variable the
  variant uses, and binding the glyph's paint to it is an override the rules allow.
- A slot is a `SlotNode` inside the instance; content is appended to it, not to the instance.
- Fonts used by an instance's text are loaded with `figma.loadFontAsync` before any text change.
- The plugin reads the file page by page, and Figma's API then refuses `instance.mainComponent` ("Cannot
  call with documentAccess: dynamic-page"): a script reads an instance's component with
  `await instance.getMainComponentAsync()`, and a search over instances awaits it for each one.

## Sizing

`layoutSizingHorizontal` and `layoutSizingVertical` take `FIXED`, `HUG` or `FILL`; `FILL` works only on a
child of an auto-layout frame. `resize()` sets both axes to `FIXED`, so it is never called on an
instance.

## Images

`use_figma` has no network access, and `figma.createImage()` and `figma.createImageAsync()` are not
supported inside it, so no script can bring an image in. The MCP tool `upload_assets` is the only way:

1. Call `upload_assets` with the `fileKey`, a `count`, and `nodeIds`, one per upload, naming the frames
   that receive the image as a fill; `scaleMode` is `FILL` (default), `FIT` or `TILE`. It returns one
   single-use `submitUrl` per upload, valid for 10 minutes.
2. POST the bytes to each `submitUrl`, as multipart/form-data with a `file` field (its filename becomes
   the layer name) or as raw bytes with the image's `Content-Type`. From a shell:
   `curl -F "file=@cover.jpg;type=image/jpeg" "<submitUrl>"`. The answer carries the `imageHash` and the
   node it was placed on.
3. Every other frame reuses that hash in `use_figma`:
   `node.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash: '<hash>' }]`.

PNG, JPEG, GIF and WebP land as image fills; SVG lands as an editable vector tree, where `nodeIds` and
`scaleMode` do not apply. An asset is at most 10 MB, and one call returns at most 60 URLs. Without
`nodeIds`, each upload is placed as a new frame on `currentPageId`.

A run that cannot reach `upload_assets` or cannot POST (no shell, no HTTP client) cannot bring an image
in at all; it says so rather than drawing a placeholder.

## Overrides

`instance.overrides` lists `{ id, overriddenFields }` for the instance and every node inside it. Any
field other than `characters`, `componentProperties` and the text and swap properties is an override
to remove with `instance.resetOverrides()` or by restoring the property on that node. The exception is
`fills` on the layer a component keeps for a picture, set to the uploaded image's hash.
