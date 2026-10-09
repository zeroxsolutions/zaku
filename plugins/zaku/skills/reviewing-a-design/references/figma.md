# Figma: reviewing a design

What has to survive a swap of drawing tool: the review reads committed data and batched images, not the
live file frame by frame.

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
