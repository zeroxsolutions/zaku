import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const BINARY = join(import.meta.dirname, '..', 'dist', 'zaku-mcp');

// macOS scans a binary it has not run before, and a freshly compiled one took from under a second to past ten
// on its first launch; every wait below is counted from the first reply, never from the spawn.
const FIRST_REPLY_MS = 60_000;

const INITIALIZE = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'e2e', version: '0' } },
};

function rpc(lines: object[]): Promise<object[]> {
  return new Promise((resolve, reject) => {
    const child = spawn(BINARY, [], {
      cwd: mkdtempSync(join(tmpdir(), 'zaku-bin-')),
      env: { ...process.env, ZAKU_SKILLS_DIR: '' },
    });
    let out = '';
    child.stdout.on('data', (chunk) => {
      out += chunk;
      const replies = out
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as { id?: number });
      if (replies.some((reply) => reply.id === 2)) {
        child.kill();
        resolve(replies);
      }
    });
    child.on('error', reject);
    for (const line of lines) child.stdin.write(`${JSON.stringify(line)}\n`);
    setTimeout(() => {
      child.kill();
      reject(new Error(`no reply; stdout: ${out}`));
    }, FIRST_REPLY_MS);
  });
}

test('the compiled zaku-mcp answers get_state over stdio', async () => {
  const replies = await rpc([
    INITIALIZE,
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'get_state', arguments: {} } },
  ]);
  const reply = replies.find((r) => (r as { id?: number }).id === 2) as { result: { content: { text: string }[] } };
  const state = JSON.parse(reply.result.content[0]!.text) as { files: unknown[]; config: { loaded: boolean } };
  assert.deepEqual(state.files, []);
  assert.equal(state.config.loaded, false);
});

test('the compiled zaku-mcp exits and frees its port when stdin closes', async () => {
  const child = spawn(BINARY, [], {
    cwd: mkdtempSync(join(tmpdir(), 'zaku-bin-')),
    env: { ...process.env, ZAKU_SKILLS_DIR: '' },
  });
  const exited = new Promise<number | null>((resolve) => child.on('exit', (code) => resolve(code)));
  const started = new Promise((resolve) => child.stdout.once('data', resolve));
  child.stdin.write(`${JSON.stringify(INITIALIZE)}\n`);
  await Promise.race([started, new Promise((resolve) => setTimeout(resolve, FIRST_REPLY_MS))]);
  child.stdin.end();
  const code = await Promise.race([
    exited,
    new Promise<'alive'>((resolve) => setTimeout(() => resolve('alive'), 5000)),
  ]);
  if (code === 'alive') child.kill();
  assert.equal(code, 0);
});
