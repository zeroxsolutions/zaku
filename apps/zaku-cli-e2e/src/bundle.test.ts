// Runs the bundled CLI, not its sources: a handler or repository whose self-registering import the
// bundler dropped passes every unit spec and fails only here.
import assert from 'node:assert/strict';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'vitest';
import { fileURLToPath } from 'node:url';

const bundle = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'zaku-cli', 'dist', 'zaku.mjs');

function product(): string {
  const root = mkdtempSync(join(tmpdir(), 'zaku-bundle-'));
  mkdirSync(join(root, 'docs', 'design'), { recursive: true });
  mkdirSync(join(root, 'tokens'));
  writeFileSync(
    join(root, 'docs', 'design', 'zaku.yaml'),
    [
      'product: smoke',
      'designSystem: { dtcg: { light: [tokens/light.json], dark: [tokens/dark.json] } }',
      'figma: { library: L, product: P }',
      'targets:',
      '  - { id: web-desktop, family: web, name: Desktop }',
      '',
    ].join('\n'),
  );
  writeFileSync(join(root, 'tokens', 'light.json'), '{"color":{"$type":"color","primary":{"$value":"#007a55"}}}');
  writeFileSync(join(root, 'tokens', 'dark.json'), '{"color":{"$type":"color","primary":{"$value":"#006045"}}}');
  return root;
}

function zaku(cwd: string, ...args: string[]): SpawnSyncReturns<string> {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    XDG_CACHE_HOME: join(cwd, '.cache'),
    ZAKU_SEAT: 'smoke',
    ZAKU_RUN: 'smoke',
  };
  delete env.FIGMA_TOKEN;
  return spawnSync(process.execPath, [bundle, ...args], { cwd, encoding: 'utf8', env });
}

test('the bundle writes tokens.json through its handler', () => {
  const root = product();
  const run = zaku(root, 'tokens');
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /colours, from DTCG/);
  assert.ok(existsSync(join(root, 'docs', 'design', 'tokens.json')));
});

test('the bundle writes the editor schemas through its handler', () => {
  const root = product();
  const run = zaku(root, 'schema', '--out', 'schemas');
  assert.equal(run.status, 0, run.stderr);
  assert.ok(JSON.parse(readFileSync(join(root, 'schemas', 'zaku.schema.json'), 'utf8')));
});

test('the bundle records budget calls in the ledger and reads them back', () => {
  const root = product();
  assert.equal(zaku(root, 'budget', 'record', '--kind', 'mcp', '--count', '2').status, 0);
  const status = zaku(root, 'budget', 'status');
  assert.equal(status.status, 0, status.stderr);
  assert.match(status.stdout, /^mcp 2 today, 2 this run/);
});
