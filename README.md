# zaku

![zaku](docs/brand/export/zaku-banner.png)

Design rules your agent can't skip. zaku is a plugin for Claude Code and Codex: its skills carry a
product's design doctrine, and its MCP server drives a Figma plugin that checks every script an agent
runs against the design system's rules, rolling back what breaks them.

## Install

```sh
/plugin marketplace add zeroxsolutions/zaku
/plugin install zaku@zaku
```

Then import `apps/zaku-figma-plugin/manifest.json` in Figma desktop (Plugins > Development > Import
plugin from manifest) and open it in the file you draw in.

## Workspace

An nx workspace. `AGENTS.md` lists the projects; `pnpm nx run-many -t lint typecheck build test e2e`
runs the gate.
