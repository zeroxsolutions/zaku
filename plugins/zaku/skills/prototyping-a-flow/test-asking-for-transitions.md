# Test: asking for the transitions between screens

## Prompt

Each run is `claude -p --model claude-opus-5-5 --output-format stream-json --verbose
--dangerously-skip-permissions`, with `ENABLE_CLAUDEAI_MCP_SERVERS=false`, from its own copy of the
inputs, the prompt as the argument. The arm's `.claude/settings.json` enables zaku and figma, and the
run reaches its own file through either server. The scoring criteria are kept outside every arm.

```
The Trips and New screens are drawn in the Figma file docs/design/zaku.yaml names, for every target. Add the motion between them: the transitions a person sees going from Trips to New and back. Report when it is done.
```

## Inputs

The `docs/design` of `test-wiring-a-feature-flow.md`, with its map and its three targets, and a file
holding `Trips / Default / <target name>` and `New / Default / <target name>` for each target, each
with library instances only.

## Pass criteria

1. Every transition is a connection's transition: the New button to New, and Back to Trips, on every
   target.
2. No node carries a timeline animation (Figma's Motion keyframes or animation styles).
3. Each transition names its pattern and its tokens, and the reply or the Motion note says what the
   tool could not draw.

## RED

The recorded session: an agent asked for the motion between screens drew it with Figma's Motion
keyframes instead of prototype connections (reported by the user). Fails 1 and 2.

## GREEN

Not run.
