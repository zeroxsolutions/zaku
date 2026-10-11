import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type WebSocket from 'ws';
import type { ServerMessage } from '../../lib/schema/bridge.js';
import { fakePlugin, obedient } from './fake-plugin.testing.js';
import { startHubCore, type HubCore } from './hub.js';

const opened: { core: HubCore; sockets: WebSocket[] }[] = [];

afterEach(async () => {
  for (const { core, sockets } of opened.splice(0)) {
    for (const socket of sockets) socket.terminate();
    await core.close();
  }
});

type Body = Record<string, unknown>;
type Call = (name: string, args?: Body) => Promise<{ error: boolean; body: Body }>;
type HubClient = { call: Call; close: () => Promise<void> };

async function hub(): Promise<{
  core: HubCore;
  client: (id: string) => Promise<HubClient>;
  plugin: (file: string, code: string, log?: ServerMessage[]) => Promise<void>;
}> {
  const dir = await mkdtemp(join(tmpdir(), 'zaku-hub-'));
  const core = await startHubCore({
    skillsDir: join(dir, 'skills'),
    ports: [0],
    timings: { timeoutMs: 200, holdMs: 400, readMs: 200 },
    pairingsFile: join(dir, 'zaku', 'pairings.json'),
    admitMs: 300,
    build: 7,
  });
  const entry = { core, sockets: [] as WebSocket[] };
  opened.push(entry);
  const client = async (id: string): Promise<HubClient> => {
    const server = core.serve({ id, cwd: `/work/${id}`, designRoot: join(dir, id, 'docs', 'design') });
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    await server.connect(serverSide);
    const mcp = new Client({ name: id, version: '0' });
    await mcp.connect(clientSide);
    return {
      call: async (name, args = {}): Promise<{ error: boolean; body: Body }> => {
        const result = (await mcp.callTool({ name, arguments: args })) as {
          content: { text: string }[];
          isError?: boolean;
        };
        return { error: result.isError === true, body: JSON.parse(result.content[0]?.text ?? 'null') as Body };
      },
      close: (): Promise<void> => mcp.close(),
    };
  };
  const plugin = async (file: string, code: string, log: ServerMessage[] = []): Promise<void> => {
    entry.sockets.push(await fakePlugin(core.port as number, file, { code }, obedient([], log)));
    await new Promise((resolve) => setTimeout(resolve, 20));
  };
  return { core, client, plugin };
}

const codeOf = (body: Body): string => String(body['code']).replace(/\s/g, '');

describe('the hub core', () => {
  it("shows a file paired through one client to every client's get_bridge_state, with its holder and the hub build", async () => {
    const { client, plugin } = await hub();
    const a = await client('a');
    const b = await client('b');
    await plugin('Untitled', codeOf((await a.call('issue_pairing_code')).body));
    const seen = (await b.call('get_bridge_state')).body as {
      files: { file: string; heldBy: unknown }[];
      hub: { build: number };
    };
    expect(seen.files.map((f) => f.file)).toEqual(['Untitled']);
    expect(seen.files[0]?.heldBy).toMatchObject({ cwd: '/work/a' });
    expect(seen.hub.build).toBe(7);
  });

  it('refuses a write from a second client before it reaches the plugin, and answers its read', async () => {
    const { client, plugin } = await hub();
    const a = await client('a');
    const b = await client('b');
    const log: ServerMessage[] = [];
    await plugin('Untitled', codeOf((await a.call('issue_pairing_code')).body), log);
    expect((await a.call('run_script', { script: 'return 1' })).error).toBe(false);
    const runs = log.filter((m) => m.type === 'run').length;
    const refused = await b.call('run_script', { script: 'return 2' });
    expect(refused.error).toBe(true);
    expect(JSON.stringify(refused.body)).toMatch(/FileHeldByAnotherSession.*\/work\/a/);
    expect(log.filter((m) => m.type === 'run').length).toBe(runs);
    expect((await b.call('get_bridge_state')).error).toBe(false);
  });

  it('lets another client write once the holder disconnects', async () => {
    const { client, plugin } = await hub();
    const a = await client('a');
    const b = await client('b');
    await plugin('Untitled', codeOf((await a.call('issue_pairing_code')).body));
    await a.close();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect((await b.call('run_script', { script: 'return 1' })).error).toBe(false);
  });

  it('leases no file to a client that left before its code was typed', async () => {
    const { client, plugin } = await hub();
    const a = await client('a');
    const b = await client('b');
    const code = codeOf((await a.call('issue_pairing_code')).body);
    await a.close();
    await new Promise((resolve) => setTimeout(resolve, 20));
    await plugin('Untitled', code);
    expect((await b.call('run_script', { script: 'return 1' })).error).toBe(false);
  });

  it("refuses a client's first write to a file paired with another client's code", async () => {
    const { client, plugin } = await hub();
    const a = await client('a');
    const b = await client('b');
    await plugin('Untitled', codeOf((await b.call('issue_pairing_code')).body));
    expect((await a.call('run_script', { script: 'return 1' })).error).toBe(true);
    expect((await b.call('run_script', { script: 'return 1' })).error).toBe(false);
  });
});
