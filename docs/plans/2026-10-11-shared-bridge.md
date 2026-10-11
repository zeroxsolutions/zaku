# One zaku bridge per machine - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for
> tracking.

**Goal:** every agent session's zaku-mcp reaches the Figma panels through one hub process per user per
machine, and a file is written by one session at a time.

**Architecture:** today's `startMcp` core (bridge, pairings, panel socket, guides, bus) moves into a hub
that serves one `McpServer` per client over a Unix socket, with the tools unchanged. An agent's zaku-mcp
becomes a pipe between its stdio and that socket, which starts the hub when nothing answers. A lease
book in the hub gives a file to the first client that writes it, or to the client whose pairing code
the file paired with.

**Tech Stack:** TypeScript, Node `net`, `ws`, `@modelcontextprotocol/sdk` (StdioServerTransport over a
socket's streams), zod, vitest, bun compile.

**Spec:** `docs/specs/2026-10-11-shared-bridge-design.md`

## Global Constraints

- The hub's socket is `<dirname of pairingsPath>/hub.sock`, its pid file `hub.pid` beside it; the
  directory is created mode 0700. `XDG_CONFIG_HOME` already moves that directory, so a test isolates
  its hub with it (the spec's `ZAKU_CONFIG_DIR` is that variable; the spec is corrected to say so).
- Hub idle exit: 30 minutes after the last client disconnects. Lease: ends on client disconnect, or 15
  minutes after its last write.
- Tool names, inputs and outputs stay; `get_bridge_state` gains fields, nothing is removed.
- Only darwin and linux are built (the launcher refuses others), so a Unix socket is the only transport.
- Plain ASCII in every authored file; commits end with the Co-Authored-By line.

## Review Focus

- A stale `hub.sock` left by a killed hub: the next client must not hang; it removes the socket file
  when a connect is refused and starts a hub. (Task 5 test.)
- Two clients starting at once both spawn a hub: the second hub must exit when the socket is taken,
  and both clients reach the first. (Task 5 test.)
- A client whose hub dies mid-session: the next tool call is answered, after the client starts a new
  hub and replays `initialize`. (Task 5 test.)
- A panel that pairs while no client issued the code (an old token): no lease is granted, and the first
  writer takes it. (Task 2 test.)
- `run_script` refused for a held file must not reach the plugin at all, so nothing is drawn and
  rolled back. (Task 3 test.)

---

### Task 1: A file id in the plugin's hello, and files named by id or name

**Files:**

- Modify: `packages/zaku/src/lib/schema/bridge.ts` (fileHelloSchema)
- Modify: `apps/zaku-figma-plugin/src/main.ts` (sayHello)
- Modify: `packages/zaku/src/lib/adapters/figma-bridge.ts` (session lookup)
- Create: `packages/zaku/src/lib/domain/errors/file-name-shared.ts`; export from `errors/index.ts`
- Modify: `packages/zaku/src/entrypoints/mcp/error-map.ts`, `tools.ts` (file field description)
- Test: `packages/zaku/src/lib/adapters/figma-bridge.spec.ts`

**Interfaces:**

- Produces: `fileHelloSchema.fileId: z.string().optional()`; `FigmaBridge.session(file?: string)`
  matches `fileId` first, then `file`; `FileNameShared(name, matches: {fileId, pages}[])`.

- [ ] **Step 1: failing specs** in figma-bridge.spec.ts:

```ts
it('finds a file by its id, and refuses a name two files share with both ids and pages', () => {
  const b = bridge();
  const one = new FakeConnection();
  const two = new FakeConnection();
  b.attach(one);
  b.attach(two);
  one.emit({ ...hello('Untitled'), fileId: 'f-1' } as PluginMessage);
  two.emit({ ...hello('Untitled'), fileId: 'f-2', pages: [{ id: '0:1', name: 'Thumbnail' }] } as PluginMessage);
  expect(b.session('f-2').fileId).toBe('f-2');
  expect(() => b.session('Untitled')).toThrow(FileNameShared);
  expect(() => b.session('Untitled')).toThrow(/f-1.*f-2/s);
});
```

- [ ] **Step 2:** run `pnpm exec vitest run packages/zaku/src/lib/adapters/figma-bridge.spec.ts`; FAIL.
- [ ] **Step 3: implement.** Schema: `fileId: z.string().max(64).optional()` in fileHelloSchema. Bridge:

```ts
const byId = all.find((s) => s.fileId === file);
if (byId) return byId;
const named = all.filter((s) => s.file === file);
if (named.length > 1)
  throw new FileNameShared(
    file,
    named.map((s) => ({ fileId: s.fileId ?? null, pages: s.pages.map((p) => p.name) })),
  );
if (named.length === 1) return named[0] as Session;
throw new FileNotConnected(
  file,
  all.map((s) => s.fileId ?? s.file),
);
```

`FileRequired` lists `name (id)` for each file. Error class:

```ts
/** Two connected files share the name a call gave; the agent names one by its id. */
export class FileNameShared extends Error {
  constructor(
    readonly file: string,
    readonly matches: readonly { fileId: string | null; pages: string[] }[],
  ) {
    super(
      `FileNameShared: ${matches.length} connected files are named ${file}; name one by its fileId: ${matches
        .map((m) => `${m.fileId ?? 'no id'} (pages: ${m.pages.join(', ')})`)
        .join('; ')}`,
    );
    this.name = 'FileNameShared';
  }
}
```

Add it to `refusalText`. Plugin `sayHello`: read `figma.root.getPluginData('zaku-file-id')`; when empty,
set it to `crypto.randomUUID()`-like id (the sandbox has no crypto: build 16 hex chars from
`Math.random`), and send `fileId`. `file` field description in tools.ts: "A connected file's fileId or
name from get_bridge_state; needed only when more than one is open".

- [ ] **Step 4:** spec passes; `pnpm nx run-many -t lint typecheck test -p zaku zaku-figma-plugin`.
- [ ] **Step 5:** commit `feat(zaku): name a connected file by an id zaku keeps in it`.

### Task 2: The lease book, and a pairing code that leases its file

**Files:**

- Create: `packages/zaku/src/lib/domain/file-leases.ts`, `file-leases.spec.ts`
- Create: `packages/zaku/src/lib/domain/errors/file-held-by-another-session.ts`; export
- Modify: `packages/zaku/src/entrypoints/mcp/pairings.ts` (issuer), `socket.ts` (onPaired)

**Interfaces:**

- Produces:

```ts
export interface LeaseClient {
  id: string;
  cwd: string;
}
export interface Lease {
  client: LeaseClient;
  lastWrite: number;
}
export const LEASE_IDLE_MS = 15 * 60_000;
export class FileLeases<K> {
  constructor(now: () => number, idleMs?: number);
  /** Takes or renews the lease for a write; throws FileHeldByAnotherSession when another client holds it. */
  write(key: K, file: string, client: LeaseClient): void;
  grant(key: K, client: LeaseClient): void;
  holder(key: K): Lease | null;
  release(clientId: string): void;
  drop(key: K): void;
}
```

`Pairings.issueCode(issuer?: LeaseClient)`; `Admission` admitted gains `issuer: LeaseClient | null`
(the issuer of the code redeemed, null for a token). `listenFirstFree(bridge, pairings, ports, admitMs,
onPaired?: (connection: BridgeConnection, issuer: LeaseClient) => void)`.

- [ ] **Step 1: failing specs** (file-leases.spec.ts):

```ts
const a = { id: 'a', cwd: '/work/a' };
const b = { id: 'b', cwd: '/work/b' };
it('gives a file to its first writer and refuses another, naming the holder', () => {
  let t = 0;
  const leases = new FileLeases<string>(() => t);
  leases.write('f', 'Untitled', a);
  expect(() => leases.write('f', 'Untitled', b)).toThrow(/\/work\/a/);
  t = 1000;
  leases.write('f', 'Untitled', a);
  expect(leases.holder('f')?.lastWrite).toBe(1000);
});
it('ends a lease when its client leaves, and 15 minutes after its last write', () => {
  let t = 0;
  const leases = new FileLeases<string>(() => t);
  leases.write('f', 'x', a);
  leases.release('a');
  leases.write('f', 'x', b);
  t = LEASE_IDLE_MS + 1;
  expect(leases.holder('f')).toBeNull();
  leases.write('f', 'x', a);
});
it('grants a file to the client whose code it paired with', () => {
  const leases = new FileLeases<string>(() => 0);
  leases.grant('f', b);
  expect(() => leases.write('f', 'x', a)).toThrow(FileHeldByAnotherSession);
});
```

and in mcp.spec.ts (pairings): a code issued with an issuer is admitted with that issuer; a token is
admitted with `issuer: null`.

- [ ] **Step 2:** FAIL.
- [ ] **Step 3: implement** `FileLeases` (a Map keyed by K; `holder` drops a lease past `idleMs`),
      `FileHeldByAnotherSession(file, holderCwd, lastWrite: number)` with message
      `FileHeldByAnotherSession: <file> is being written by the session in <cwd> (last write <ISO>); write it from that session, or wait until it ends or 15 minutes pass`.
      `Pairings` keeps `issuer` beside the live code; `admit` returns it when the code is redeemed.
      `socket.ts` calls `onPaired(connection, issuer)` right after `bridge.attach` when `issuer !== null`.
- [ ] **Step 4:** pass; lint, typecheck.
- [ ] **Step 5:** commit `feat(zaku): lease a file to the session that writes it`.

### Task 3: The hub core, serving one McpServer per client

**Files:**

- Create: `packages/zaku/src/entrypoints/mcp/hub.ts`, `hub.spec.ts`
- Modify: `packages/zaku/src/entrypoints/mcp/main.ts` (startMcp becomes hub core plus one in-process
  client), `tools.ts` (seams: `client`, `leases`, `hub`), `index.ts` (exports)

**Interfaces:**

- Consumes: `FileLeases`, `Pairings.issueCode(issuer)`, `listenFirstFree(..., onPaired)`.
- Produces:

```ts
export interface ClientInfo {
  id: string;
  cwd: string;
  designRoot: string;
}
export interface HubSeams extends Omit<McpSeams, 'cwd' | 'env'> {
  build: number;
  now?: () => number;
}
export interface HubCore {
  bridge: FigmaBridge;
  pairings: Pairings;
  leases: FileLeases<BridgeConnection>;
  readonly port: number | null;
  readonly portError: string | null;
  build: number;
  /** A server for one client; its leases end when it closes. */
  serve(client: ClientInfo): McpServer;
  close(): Promise<void>;
}
export function startHubCore(seams: HubSeams): Promise<HubCore>;
```

ToolSeams gains `client: ClientInfo`, `leases: FileLeases<BridgeConnection>`, `hub: { build: number;
portHolders: () => Promise<PortHolder[]> }`; `designRoot` comes from `client.designRoot`.

- [ ] **Step 1: failing specs** (hub.spec.ts), each over two InMemoryTransport clients of one core and a
      fakePlugin on the core's port:
  - both clients' `get_bridge_state` list the paired file;
  - client B's `run_script` on a file client A wrote is refused with `FileHeldByAnotherSession` and the
    fake plugin receives no second `run` message; B's `read_nodes` is answered;
  - closing A's server lets B write;
  - a file paired with a code B issued is refused to A's first `run_script`;
  - `get_bridge_state` reports `files[].heldBy` (`{ cwd, lastWrite }` or null) and `hub.build`.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: implement.** Move the body of `startMcp` up to `registerTools` into `startHubCore`;
      `serve(client)` builds `new McpServer`, calls `registerTools` with the client's seams, and on
      `server.server.onclose` calls `leases.release(client.id)`. In tools.ts: `run_script` calls
      `seams.leases.write(session.connection, session.file, seams.client)` after resolving the session and
      before `bus.send` (resolve the session in the tool, pass its name on as today); `issue_pairing_code`
      calls `seams.pairings.issueCode(seams.client)`. `get_bridge_state` maps each session view to
      `{ ...view, heldBy }` and adds `hub: { build, portHolders }` (Task 6 fills portHolders; here
      `async () => []`). Bridge `onClose` of a connection calls `leases.drop(connection)`. `startMcp` keeps
      its signature: `startHubCore` plus `serve({ id: 'local', cwd: seams.cwd, designRoot })`, so
      mcp.spec.ts runs unchanged.
- [ ] **Step 4:** hub.spec.ts and mcp.spec.ts pass; lint, typecheck.
- [ ] **Step 5:** commit `feat(zaku): one bridge core that serves every client its own tools`.

### Task 4: The hub process: a Unix socket, idle exit, handover

**Files:**

- Create: `packages/zaku/src/entrypoints/mcp/hub-protocol.ts` (zod schemas),
  `hub-server.ts`, `hub-server.spec.ts`

**Interfaces:**

- Produces:

```ts
export const clientHelloSchema = z
  .object({
    type: z.literal('client'),
    cwd: z.string(),
    designRoot: z.string(),
    build: z.number(),
    handover: z.boolean().optional(),
  })
  .strict();
export const hubHelloSchema = z
  .object({
    type: z.literal('hub'),
    build: z.number(),
    port: z.number().nullable(),
    handingOver: z.boolean().optional(),
  })
  .strict();
export const HUB_IDLE_MS = 30 * 60_000;
export interface HubServer {
  close(): Promise<void>;
}
export function listenHub(
  core: HubCore,
  socketPath: string,
  options: { idleMs?: number; onIdle: () => void; onHandover: () => void },
): Promise<HubServer | { error: 'taken' }>;
export function hubPaths(pairingsFile: string): { socket: string; pid: string };
```

- [ ] **Step 1: failing specs** over a temp socket path:
  - a client line `clientHello` is answered with `hubHello`, then MCP `initialize` over the same socket
    is answered (StdioServerTransport over the socket's streams);
  - `onIdle` fires `idleMs` after the last client leaves and not while one is connected (fake timers);
  - a second `listenHub` on a socket a live hub holds answers `{ error: 'taken' }`; on a stale socket
    file (no listener) it removes the file and listens;
  - a hello with `handover: true` and a newer build is answered `handingOver: true`, and `onHandover`
    fires once the bridge has no script running (`bridge.idle()` resolves);
  - an older client's `handover: true` is ignored.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: implement** with `net.createServer`; read the first line, parse `clientHelloSchema`,
      write `hubHello` + `\n`, then `core.serve(client).connect(new StdioServerTransport(socket, socket))`.
      Stale check: `net.connect(socketPath)` that errors `ECONNREFUSED` or `ENOENT` means unlink and listen;
      a successful connect means `{ error: 'taken' }`. `chmod` the directory 0700 when created. Add
      `FigmaBridge.idle(): Promise<void>` resolving when no `exclusive` work is queued (track a counter in
      `exclusive`), with a spec in figma-bridge.spec.ts.
- [ ] **Step 4:** pass; lint, typecheck.
- [ ] **Step 5:** commit `feat(zaku): the hub listens for its clients on a socket only the user reaches`.

### Task 5: The client pipe

**Files:**

- Create: `packages/zaku/src/entrypoints/mcp/hub-client.ts`, `hub-client.spec.ts`

**Interfaces:**

- Produces:

```ts
export interface ClientSeams {
  socketPath: string;
  build: number;
  cwd: string;
  designRoot: string;
  spawnHub: () => void;
  stdin: NodeJS.ReadableStream;
  stdout: NodeJS.WritableStream;
  connectMs?: number;
}
/** Pipes stdio to the hub until stdin ends; answers the exit code. */
export function runClient(seams: ClientSeams): Promise<number>;
```

- [ ] **Step 1: failing specs** with an in-process `listenHub` and `spawnHub` a test double that starts
      one:
  - no hub: the client calls `spawnHub`, connects, and an `initialize` written to stdin is answered on
    stdout;
  - a stale socket file: answered as above;
  - two clients started together with a `spawnHub` that starts a hub each: both are answered by one hub
    (the second `listenHub` answers taken and is discarded);
  - the hub closes mid-session: the next `tools/call` is answered after the client re-spawns, replays
    the stored `initialize` and `notifications/initialized`, and drops the replayed reply;
  - a request in flight when the hub closed is answered with a JSON-RPC error
    `{ code: -32000, message: 'zaku hub restarted; call again' }`;
  - the hub answers an older build: the client sends `handover`, waits for the close, spawns, and
    reaches a hub with its own build;
  - stdin ending resolves `0` and closes the socket.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: implement.** Line-buffer both directions; remember the first `initialize` request and
      the `notifications/initialized` notification; keep a map of request ids in flight. Connect with
      retries every 100 ms up to `connectMs` (default 5000) after `spawnHub`.
- [ ] **Step 4:** pass; lint, typecheck.
- [ ] **Step 5:** commit `feat(zaku): an agent's zaku-mcp reaches the hub through a pipe`.

### Task 6: The binary, the old zaku-mcp on a port, and the docs

**Files:**

- Modify: `apps/zaku-mcp/src/main.ts`; `packages/zaku/src/entrypoints/mcp/index.ts`
- Create: `packages/zaku/src/entrypoints/mcp/port-holders.ts`, `port-holders.spec.ts`
- Modify: `apps/zaku-mcp-e2e/src/binary.test.ts`
- Modify: `docs/specs/2026-10-11-shared-bridge-design.md` (decision 9: `XDG_CONFIG_HOME`)
- Modify: skills that tell the agent about ports or pairing, found with
  `grep -rn "Use another port\|port 73\|issue_pairing_code" plugins/zaku/skills`

**Interfaces:**

- Produces: `portHolders(ports, below: number, run: (cmd, args) => Promise<string>)` answering
  `{ port, pid, command }[]` for every port of the range below the hub's that another process holds,
  read from `lsof -nP -iTCP:<port> -sTCP:LISTEN -Fpc`.

- [ ] **Step 1: failing specs:** `port-holders.spec.ts` parses lsof's `-F` output (`p123\nczaku-mcp\n`);
      binary.test.ts: two binaries with one `XDG_CONFIG_HOME` answer `get_bridge_state` with one port and
      one `hub.build`; the client exits 0 on stdin close while the hub keeps the port; teardown reads
      `hub.pid` and kills the hub.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: implement.** `main.ts`: `process.argv[2] === 'hub'` runs `startHubCore` +
      `listenHub` (exit 0 on `{ error: 'taken' }`, `onIdle` and `onHandover` close and exit 0, write and
      remove `hub.pid`); otherwise `runClient` with `build = statSync(process.execPath).mtimeMs`,
      `spawnHub = spawn(process.execPath, ['hub'], { detached: true, stdio: 'ignore', env: process.env }).unref()`.
- [ ] **Step 4:** `pnpm nx run zaku-mcp:plugin-bin --skip-nx-cache`, then
      `CI=true pnpm nx run zaku-mcp-e2e:e2e` with no Figma panel open.
- [ ] **Step 5:** commit `feat(zaku-mcp): start the hub on first use and pipe each session to it`.
