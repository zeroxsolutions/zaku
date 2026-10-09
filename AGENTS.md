# AGENTS.md

zaku: a design-discipline plugin for Claude Code and Codex. Its skills carry the design doctrine, and
its checker, MCP server and Figma plugin enforce it on every change an agent draws.

## Workspace

- `packages/zaku` (`@zeroxsolutions/zaku`) - the zaku bounded context: design checks, tokens, recipe,
  library and outline, the bridge schema, and the CLI and MCP entrypoints.
- `apps/zaku-cli` - builds `plugins/zaku/bin/zaku.mjs`.
- `apps/zaku-mcp` - builds the `zaku-mcp` binary with Bun; `plugin-bin` places it beside the launcher.
- `apps/zaku-figma-plugin` - the Figma plugin: the sandbox (`src/main.ts`) and the panel (`src/ui.tsx`).
- `plugins/zaku` - the plugin payload: skills, hooks, schemas, the launchers and `.mcp.json`.
- `docs/brand` - the logo, mascot, banner and favicon, their prompts and `export.py`.
- `iac/` - Terraform, outside the nx graph.
