# Figma: reviewing a design

What has to survive a swap of drawing tool: the review reads committed data and batched images, not the
live file frame by frame.

## Reaching the file

A run reaches the file through zaku's MCP server, which drives the zaku plugin open in the file, or
through Figma's MCP server. Both render a node with `get_screenshot`; the rules over a page come from
`check_rules` on zaku's, and from `zaku rules script --page <page>` run through `use_figma` and read by
`zaku check --input <file>` on Figma's. REST, which the outline reads, is the same either way.

## Images in one call

`GET /v1/images/:key?ids=<id>,<id>,...&format=png&scale=1` renders nodes in one REST call, counted apart
from the MCP's daily quota. The comparison image is the screen's Section id, rendered whole. The MCP's
`get_screenshot` renders one node per call and is kept for a single question.

## The library's version

`GET /v1/files/:library?depth=1` answers with the library file's `version`; it differs from
`library.json`'s `version` once anything wrote to the library after the snapshot.

## The outline

`zaku outline --frames <ids>` rereads only the frames a change wrote, through the REST nodes endpoint,
and records each instance's overrides with their fields, down to nested nodes.
