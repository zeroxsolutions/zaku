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

The first time, the panel says it is not paired. Ask your agent to pair with zaku: it shows an
eight-digit code, and you type that code into the panel. The code works once, for five minutes. The
panel then keeps a token and connects on its own from then on; Unpair in the panel, or the agent's
`unpair` tool, revokes it. zaku-mcp keeps only a SHA-256 hash of each token, in
`zaku/pairings.json` under your config directory (`$XDG_CONFIG_HOME`, else `~/Library/Application
Support` on macOS, `%APPDATA%` on Windows, `~/.config` elsewhere).

zaku-mcp listens on the first free port from 7337 to 7346, or on `ZAKU_PORT` when it is set. Figma lets
the plugin reach only the ports its manifest lists, so a `ZAKU_PORT` outside that range stops zaku-mcp at
startup. The panel dials the port it last connected on, then tries the rest of the range once. If it
says Not connected, ask your agent which port zaku-mcp is on (`get_state` and `pair` report it), enter it
in the panel's Port field and press Connect.

## Workspace

An nx workspace. `AGENTS.md` lists the projects; `pnpm nx run-many -t lint typecheck build test e2e`
runs the gate.
