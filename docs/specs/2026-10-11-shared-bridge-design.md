# zaku: one bridge per machine, shared by every agent session

## Why

Every agent session starts its own zaku-mcp, and each one listens on the first free port of 7337-7346.
A Figma panel holds one socket, to the port it last connected on, and any zaku-mcp on the machine
admits its token, because the pairings live in one file. So with two sessions open:

- A panel opened in one session's file rejoins whichever zaku-mcp now holds its port, which may be the
  other session's. That session then sees, and can draw into, a file it was never given.
- The session the file was meant for answers `PluginNotConnected`, and the person has to Unpair, pick
  another port and type a new code, in the right file, before every run.
- A session left running keeps an old zaku-mcp binary on a port after an update, and a panel that
  lands on it runs checks the release fixed.

On 2026-10-11 a test file's panel joined a migration session's zaku-mcp on 7337 while the test run's own
zaku-mcp waited on 7338, and two rounds of pairing failed before the cause was found.

## Decisions

1. **One hub per user per machine.** `zaku-mcp hub` is a process of its own that owns every panel
   connection: it listens on 7337 (the next free port of 7337-7346 when another program holds it) and
   keeps one session per connected file, as the bridge does now. It is not any agent session's child,
   so a session ending does not drop the panels.
2. **An agent's zaku-mcp is a client of the hub.** On start it connects to the hub's socket,
   `<config>/zaku/hub.sock` (the directory the pairings file already lives in, mode 0700), and starts
   the hub detached when nothing answers there. Every tool call goes to the hub over that socket; the
   tools, their input and their output do not change. A local socket in a directory only the user can
   read is the boundary: no other user's process can drive the user's Figma files.
3. **The hub outlives its clients briefly.** It exits 30 minutes after its last client disconnects, so
   an open panel is not paired again between two sessions; a panel open with no hub redials until the
   next client starts one.
4. **A file is written by one session at a time.** The first `run_script` that writes a file gives the
   calling client a lease on it; a write from another client is refused with `FileHeldByAnotherSession`,
   naming the holder's working directory and when it last wrote. Reads (`read_nodes`, `check_rules`,
   `get_screenshot`, `get_bridge_state`) stay open to every client. A lease ends when its client
   disconnects or 15 minutes after its last write. `get_bridge_state` shows each file's holder. A file
   paired with a code a client issued is that client's from the moment it pairs, so the session that
   asked for the file is the one that writes it.
5. **A file is named by an id zaku keeps in it.** With one hub, two sessions' files sit side by side,
   and two new files are both "Untitled". A public plugin cannot read the file's key: the Plugin API
   typings (figma-use plugin 2.2.127) give `figma.fileKey` only to private plugins that set
   `enablePrivatePluginApi`. So the panel writes a random id into the file's plugin data the first time
   it opens there, and its hello carries the id beside the name and the pages. `get_bridge_state` lists
   all three, and a tool's `file` takes the id or the name; a name two connected files share is refused
   with both files' ids and pages, so the agent picks or asks.
6. **The hub's version is the newest client's.** A client whose binary is newer than the hub's asks it to
   hand over once no `run_script` is running: the hub closes, the client starts its own binary as the
   hub, and the panels redial the same port. An older client uses the newer hub. `get_bridge_state`
   reports the hub's version.
7. **Pairing does not change.** A code from `issue_pairing_code` is good on the hub for 5 minutes; a
   token stays per panel, and Unpair revokes only that panel's.
8. **An old zaku-mcp is named, not fought.** A pre-hub zaku-mcp that holds 7337 keeps it; the hub takes
   the next port, and `get_bridge_state` names the process holding 7337 so the person can end it.
9. **`ZAKU_PORT` pins the hub's port**, not a client's, for a test that needs its own hub; such a test
   sets `ZAKU_CONFIG_DIR` too, so its hub socket and pairings are its own.

## Out of scope

- A second machine, or a second user on one machine.
- Two sessions writing one file together; the lease refuses the second.

## Tests

Written first, each seen failing:

- A client with no hub running starts one, and a second client reaches the same hub.
- A panel paired once is seen by both clients' `get_bridge_state`.
- A `run_script` write from a second client on a file the first holds is refused with
  `FileHeldByAnotherSession`, naming the holder; a `read_nodes` from it is answered.
- The lease ends when its client disconnects, and 15 minutes after its last write.
- The hub exits 30 minutes after its last client leaves, and not while one is connected.
- A newer client takes the hub over only when no script is running, and the panel redials onto it.
- Two files named "Untitled" make a call naming "Untitled" refused with both ids and page lists, and
  a call naming one id is answered.
- A file paired with a code a client issued is leased to that client.
- The panel writes the file id once, and reads the same id when it opens there again.
- A pre-hub zaku-mcp on 7337 leaves the hub on 7338, and `get_bridge_state` names that process.
- A tool call with the hub gone answers `PluginNotConnected` with the reason, and the next call after a
  client restarted the hub is answered.
