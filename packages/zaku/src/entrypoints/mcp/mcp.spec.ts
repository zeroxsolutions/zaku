import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import WebSocket from 'ws';
import type { ServerMessage } from '../../lib/schema/bridge.js';
import { fakePlugin, obedient, unboundCard } from './fake-plugin.testing.js';
import { startMcp, type McpRuntime } from './main.js';

const open: { runtime: McpRuntime; sockets: WebSocket[] }[] = [];

/** A pushed message is sent without a reply, so the tool can answer before the plugin has it. */
async function until(condition: () => boolean, ms = 2000): Promise<void> {
  const deadline = Date.now() + ms;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('condition not met in time');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

type Call = (
  name: string,
  args?: Record<string, unknown>,
) => Promise<{ error: boolean; body: Record<string, unknown> & { files?: unknown[]; text?: string } }>;
type PluginArgs = Parameters<typeof fakePlugin> extends [number, ...infer R] ? R : never;

async function setup(
  timings = { timeoutMs: 200, holdMs: 400, readMs: 200 },
): Promise<{ runtime: McpRuntime; call: Call; plugin: (...args: PluginArgs) => Promise<WebSocket> }> {
  const cwd = await mkdtemp(join(tmpdir(), 'zaku-mcp-'));
  const runtime = await startMcp({ cwd, env: {}, skillsDir: join(cwd, 'skills'), port: 0, timings });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await runtime.server.connect(serverSide);
  const client = new Client({ name: 'spec', version: '0' });
  await client.connect(clientSide);
  const entry = { runtime, sockets: [] as WebSocket[] };
  open.push(entry);
  const call: Call = async (name, args = {}) => {
    const result = (await client.callTool({ name, arguments: args })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };
    return { error: result.isError === true, body: JSON.parse(result.content[0]?.text ?? 'null') };
  };
  const plugin = async (...args: PluginArgs): Promise<WebSocket> => {
    const socket = await fakePlugin(runtime.port as number, ...args);
    entry.sockets.push(socket);
    await new Promise((resolve) => setTimeout(resolve, 20));
    return socket;
  };
  return { runtime, call, plugin };
}

afterEach(async () => {
  for (const { runtime, sockets } of open.splice(0)) {
    for (const socket of sockets) socket.terminate();
    await runtime.close();
  }
});

describe('zaku-mcp over a real socket', () => {
  it('lists the five tools', async () => {
    const { runtime } = await setup();
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    await runtime.server.close();
    await runtime.server.connect(serverSide);
    const client = new Client({ name: 'spec', version: '0' });
    await client.connect(clientSide);
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual(['check', 'execute', 'get_state', 'read', 'read_guide']);
  });

  it('answers PluginNotConnected with no plugin open', async () => {
    const { call } = await setup();
    expect(await call('execute', { script: 'return 1' })).toEqual({
      error: true,
      body: { error: 'PluginNotConnected: open zaku in Figma (Plugins > zaku)' },
    });
  });

  it('reports the connected file in get_state', async () => {
    const { call, plugin } = await setup();
    await plugin('Ant Design', obedient([]));
    const { body } = await call('get_state');
    expect(body).toMatchObject({ files: [{ file: 'Ant Design' }], config: { loaded: false } });
  });

  it('commits a clean run', async () => {
    const { call, plugin } = await setup();
    const log: ServerMessage[] = [];
    await plugin('A', obedient([], log));
    expect((await call('execute', { script: 'return 1' })).body).toMatchObject({ outcome: 'committed' });
    await until(() => log.length === 3);
    expect(log.map((m) => m.type)).toEqual(['run', 'decide', 'findings']);
  });

  it('rolls back a run with a finding', async () => {
    const { call, plugin } = await setup();
    await plugin('A', obedient([unboundCard]));
    expect((await call('execute', { script: 'return 1' })).body).toMatchObject({
      outcome: 'rolled-back',
      reason: 'findings',
      findings: [{ check: 'binding', field: 'fill' }],
    });
  });

  it('rolls back a thrown script', async () => {
    const { call, plugin } = await setup();
    await plugin('A', (m, send) => {
      if (m.type === 'run')
        send({ type: 'threw', runId: m.runId, error: 'TypeError: x is undefined', untouchable: [] });
    });
    expect((await call('execute', { script: 'x.y' })).body).toMatchObject({ outcome: 'rolled-back', reason: 'threw' });
  });

  it('times out a script the plugin never finishes', async () => {
    const { call, plugin } = await setup();
    const log: ServerMessage[] = [];
    await plugin('A', (m) => log.push(m));
    expect((await call('execute', { script: 'for(;;){}' })).body).toMatchObject({
      outcome: 'rolled-back',
      reason: 'timeout',
    });
    await until(() => log.length === 2);
    expect(log.at(-1)).toMatchObject({ type: 'decide', decision: 'rollback' });
  });

  it('answers unknown when the plugin drops between run and decision', async () => {
    const { call, plugin } = await setup();
    await plugin('A', (m, send, socket) => {
      if (m.type === 'run') {
        send({ type: 'ran', runId: m.runId, ok: true, value: 1, created: [], mutated: [], snapshot: [] });
        socket.terminate();
      }
    });
    expect((await call('execute', { script: 'return 1' })).body).toEqual({
      outcome: 'unknown',
      message: 'read before retrying',
    });
  });

  it('runs two executes on one file one after the other', async () => {
    const { call, plugin } = await setup({ timeoutMs: 1000, holdMs: 2000, readMs: 1000 });
    const order: string[] = [];
    await plugin('A', (m, send) => {
      if (m.type === 'run') {
        order.push(`run ${m.script}`);
        setTimeout(
          () =>
            send({ type: 'ran', runId: m.runId, ok: true, value: m.script, created: [], mutated: [], snapshot: [] }),
          50,
        );
      }
      if (m.type === 'decide') {
        order.push(`decide ${m.runId}`);
        send({ type: 'settled', runId: m.runId, outcome: 'committed', untouchable: [] });
      }
    });
    await Promise.all([call('execute', { script: 'return 1' }), call('execute', { script: 'return 2' })]);
    expect(order.map((line) => line.split(' ')[0])).toEqual(['run', 'decide', 'run', 'decide']);
  });

  it('refuses a connection from a web origin', async () => {
    const { runtime } = await setup();
    const socket = new WebSocket(`ws://127.0.0.1:${runtime.port}`, { origin: 'https://evil.example' });
    const outcome = await new Promise<string>((resolve) => {
      socket.once('open', () => resolve('open'));
      socket.once('error', () => resolve('refused'));
      socket.once('unexpected-response', () => resolve('refused'));
    });
    expect(outcome).toBe('refused');
  });

  it('admits the null origin Figma sends', async () => {
    const { call, plugin } = await setup();
    await plugin('A', obedient([]), 'null');
    expect((await call('get_state')).body.files).toHaveLength(1);
  });

  it('answers get_state when the port is taken', async () => {
    const first = await setup();
    const cwd = await mkdtemp(join(tmpdir(), 'zaku-mcp-'));
    const second = await startMcp({ cwd, env: {}, skillsDir: cwd, port: first.runtime.port as number });
    open.push({ runtime: second, sockets: [] });
    expect(second.port).toBeNull();
    expect(second.portError).toMatch(/in use/);
  });

  it('names the taken port when no plugin is connected, and listens once the port frees up', async () => {
    const first = await setup();
    const taken = first.runtime.port as number;
    const cwd = await mkdtemp(join(tmpdir(), 'zaku-mcp-'));
    const second = await startMcp({ cwd, env: {}, skillsDir: cwd, port: taken, retryListenMs: 20 });
    open.push({ runtime: second, sockets: [] });
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    await second.server.connect(serverSide);
    const client = new Client({ name: 'spec', version: '0' });
    await client.connect(clientSide);
    const refused = (await client.callTool({ name: 'execute', arguments: { script: 'return 1' } })) as {
      content: { text: string }[];
    };
    expect(JSON.parse(refused.content[0]?.text ?? 'null').error).toContain(`port ${taken} is in use`);
    await first.runtime.close();
    open.splice(open.indexOf(open.find((entry) => entry.runtime === first.runtime) as (typeof open)[number]), 1);
    await until(() => second.port === taken);
    expect(second.portError).toBeNull();
  });

  it('reads a guide, and lists the topics for one it does not have', async () => {
    const { call } = await setup();
    expect((await call('read_guide', { topic: 'binding' })).body.text).toContain('Why');
    expect(await call('read_guide', { topic: 'nope' })).toMatchObject({ error: true });
  });

  it('checks the current page and pushes the findings', async () => {
    const { call, plugin } = await setup();
    const log: ServerMessage[] = [];
    await plugin('A', obedient([unboundCard], log));
    expect((await call('check', { scope: 'page' })).body).toMatchObject({ findings: [{ check: 'binding' }] });
    await until(() => log.length === 2);
    expect(log.map((m) => m.type)).toEqual(['snapshot', 'findings']);
  });

  it('checks the page when the plugin asks, and pushes the findings', async () => {
    const { plugin } = await setup();
    const log: ServerMessage[] = [];
    const socket = await plugin('A', obedient([unboundCard], log));
    socket.send(JSON.stringify({ type: 'check', scope: { page: true } }));
    await until(() => log.length === 2);
    expect(log.map((m) => m.type)).toEqual(['snapshot', 'findings']);
    expect(log[1]).toMatchObject({ findings: [{ check: 'binding' }] });
  });

  it('waits for a running execute before a panel check snapshots the page', async () => {
    const { call, plugin } = await setup();
    const log: ServerMessage[] = [];
    const answer = obedient([unboundCard]);
    await plugin('A', (message, send, socket) => {
      log.push(message);
      if (message.type !== 'run') return answer(message, send, socket);
      socket.send(JSON.stringify({ type: 'check', scope: { page: true } }));
      setTimeout(() => answer(message, send, socket), 50);
    });
    await call('execute', { script: 'return 1', mode: 'report' });
    await until(() => log.length === 5);
    expect(log.map((m) => m.type)).toEqual(['run', 'decide', 'findings', 'snapshot', 'findings']);
  });

  it('ignores a check from a socket that has not said hello', async () => {
    const { runtime, call } = await setup();
    const socket = new WebSocket(`ws://127.0.0.1:${runtime.port}`);
    const received: string[] = [];
    socket.on('message', (data) => received.push(String(data)));
    await new Promise((resolve) => socket.once('open', resolve));
    socket.send(JSON.stringify({ type: 'check', scope: { page: true } }));
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(received).toEqual([]);
    expect((await call('get_state')).body.files).toEqual([]);
    socket.terminate();
  });
});
