# Figma: reading a design

What has to survive a swap of drawing tool: a frame is reached by its own id, one at a time, and a
read is counted against the seat.

## A frame's id

A Figma URL carries the file key after `/design/` and the node id in `node-id=`, written with a dash
(`12-345`); the API spells it with a colon (`12:345`).

## Finding a frame by its name

Without an outline, `GET /v1/files/:key?depth=4` lists every page, its Sections and the frames inside
them, with names and ids, in one REST call and no MCP call; the frame is the one whose name the map
builds. Walking a page with `get_metadata` reads every frame on it.

## Reading one frame

- `get_metadata` with the frame's node id returns its layer tree, names, types and bounds, without
  styles. It is the cheapest structural read.
- `get_screenshot` with the frame's node id returns its image. Never pass a page.
- `get_design_context` is not used for override questions: it can return the main component's values
  instead of an instance's.
- Reads of many frames go through the REST file endpoint, `GET /v1/files/:key/nodes?ids=<id>,<id>`,
  one call for every frame, and images through `GET /v1/images/:key?ids=...`, one call for every image.
  REST has its own quota, counted apart from the MCP's.

## The seat's limits

A Professional Full seat has 200 MCP calls a day, and REST allows 10 to 20 file reads a minute (Figma
plan limits). `zaku budget status` refuses once 80% of the day's MCP calls are spent or a run has used
30, and a REST answer of 429 is waited out once. `zaku outline` reads over REST, so it needs
`FIGMA_TOKEN`, a personal access token with file read access, and the product file's key in
`zaku.yaml` (`figma.product`); without either the command exits 3, naming what is missing, and the
answer comes from the outlines already committed. A missing product file is asked for, never created. When it refuses, the answer comes from the map and
the outline, and the reply says the drawing was not read.
