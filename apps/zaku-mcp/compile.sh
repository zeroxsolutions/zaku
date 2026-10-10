#!/bin/sh
# Compiles dist/zaku-mcp with the Bun that .tool-versions pins, then proves the binary starts.
# A stale Bun first on PATH once compiled a binary macOS killed at launch, and nothing noticed
# until a client reported the server as closed.
set -eu
here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
pinned=$(sed -n 's/^bun[[:space:]]\{1,\}\([^[:space:]]*\).*/\1/p' "$here/../../.tool-versions")
found=$(bun --version 2>/dev/null || echo none)
if [ "$found" != "$pinned" ]; then
  echo "zaku-mcp: bun $found at $(command -v bun || echo 'no path') is not the bun $pinned that .tool-versions pins; run mise install, then put mise's bun first on PATH or run mise exec -- pnpm nx run zaku-mcp:plugin-bin" >&2
  exit 1
fi

binary="$here/dist/zaku-mcp"
# A new file rather than an overwrite: macOS keeps a signed file's signature in the kernel and does
# not flush it when the contents change in place.
# https://developer.apple.com/documentation/security/updating-mac-software (read 2026-10-10)
rm -f "$binary"
bun build --compile --minify --sourcemap "$here/src/main.ts" --outfile "$binary"

# Linux has no codesign, and Bun signs its darwin builds ad hoc, so only darwin checks a signature.
if [ "$(uname -s)" = Darwin ]; then
  codesign --verify "$binary"
fi

# A ZAKU_PORT outside the range makes the binary refuse before it opens a port, so the smoke runs
# its bundled code while a Figma panel open on this machine has nothing to dial. A binary the
# kernel kills exits 137 and writes nothing.
set +e
refusal=$(ZAKU_PORT=0 "$binary" </dev/null 2>&1 >/dev/null)
code=$?
set -e
case "$code:$refusal" in
  1:*ZAKU_PORT=0*) ;;
  *)
    echo "zaku-mcp: $binary did not start: exit $code, $refusal" >&2
    exit 1
    ;;
esac
