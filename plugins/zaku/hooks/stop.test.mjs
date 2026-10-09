// Run with `node --test plugins/zaku/hooks/stop.test.mjs`. It drives stop.mjs as Claude Code does, through stdin,
// against a Figma product served by a stand-in for the REST API, so it needs no token and no network.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { isDrawingWrite, lastTurnToolCalls } from './stop.mjs';

const hook = join(dirname(fileURLToPath(import.meta.url)), 'stop.mjs');

const typed = (text) => JSON.stringify({ type: 'user', uuid: `u-${text}`, message: { content: text } });
const called = (name) =>
  JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name, input: {} }] } });
const result = () => JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', content: 'ok' }] } });

function repo(withConfig) {
  const root = mkdtempSync(join(tmpdir(), 'zaku-hook-'));
  if (!withConfig) return root;
  mkdirSync(join(root, 'docs', 'design', 'map'), { recursive: true });
  writeFileSync(
    join(root, 'docs', 'design', 'zaku.yaml'),
    'product: acme\ndesignSystem: { shadcn: { preset: x } }\nfigma: { library: L, product: P }\ntargets:\n  - { id: ios-phone, family: ios, name: iPhone }\n',
  );
  writeFileSync(
    join(root, 'docs', 'design', 'map', 'trips.yaml'),
    'feature: trips\nscreens:\n  trip:\n    title: Trip\n    states: [Default]\n',
  );
  return root;
}

const run = Math.random().toString(36).slice(2);

function stop(cwd, lines, session = 's1', extraEnv = {}) {
  const transcript = join(cwd, 'transcript.jsonl');
  writeFileSync(transcript, lines.join('\n'));
  const env = { ...process.env, FIGMA_TOKEN: '', XDG_CACHE_HOME: join(cwd, 'cache'), ...extraEnv };
  const out = spawnSync(process.execPath, [hook], {
    input: JSON.stringify({ cwd, transcript_path: transcript, session_id: `${session}-${run}` }),
    encoding: 'utf8',
    env,
  });
  return out.stdout.trim() ? JSON.parse(out.stdout) : null;
}

test('a write tool is use_figma, under any server prefix', () => {
  assert.equal(isDrawingWrite('mcp__plugin_figma_figma__use_figma'), true);
  assert.equal(isDrawingWrite('mcp__figma__use_figma'), true);
  assert.equal(isDrawingWrite('mcp__plugin_figma_figma__get_screenshot'), false);
  assert.equal(isDrawingWrite('Bash'), false);
});

test('the last turn starts at the last message a person typed, not at a tool result', () => {
  const { calls } = lastTurnToolCalls([
    typed('one'),
    called('mcp__plugin_figma_figma__use_figma'),
    typed('two'),
    called('Read'),
    result(),
    called('mcp__plugin_figma_figma__use_figma'),
  ]);
  assert.deepEqual(calls, ['Read', 'mcp__plugin_figma_figma__use_figma']);
});

test('a repository without zaku.yaml, or a turn that wrote nothing, is not touched', () => {
  assert.equal(stop(repo(false), [typed('draw'), called('mcp__plugin_figma_figma__use_figma')]), null);
  assert.equal(stop(repo(true), [typed('read'), called('Read')]), null);
});

test('a turn that wrote and cannot be outlined ends, saying why the drawing is unchecked', () => {
  const reply = stop(
    repo(true),
    [typed('draw it'), called('mcp__plugin_figma_figma__use_figma'), result()],
    'untokened',
  );
  assert.equal(reply?.decision, undefined);
  assert.match(reply?.systemMessage ?? '', /zaku check not run: zaku outline needs FIGMA_TOKEN/);
});

/** A repository whose product file a stand-in for the Figma REST API serves: one root frame, in its Sections. */
function figmaRepo(screen) {
  const cwd = mkdtempSync(join(tmpdir(), 'zaku-hook-'));
  mkdirSync(join(cwd, 'docs', 'design', 'map'), { recursive: true });
  writeFileSync(
    join(cwd, 'docs', 'design', 'zaku.yaml'),
    'product: acme\ndesignSystem: { shadcn: { preset: x } }\nfigma: { library: L, product: P }\ntargets:\n  - { id: web-desktop, family: web, name: Desktop }\n',
  );
  writeFileSync(join(cwd, 'docs', 'design', 'map', 'trips.yaml'), `feature: trips\nscreens:\n  trip:\n${screen}`);
  const frame = {
    id: '1:1',
    name: 'Trip / Default / Desktop',
    type: 'FRAME',
    absoluteBoundingBox: { x: 0, y: 0, width: 1440, height: 900 },
    children: [],
  };
  const page = {
    id: '0:1',
    name: 'Trips',
    type: 'CANVAS',
    flowStartingPoints: [{ nodeId: '1:1', name: 'Trip' }],
    children: [
      {
        id: '2:1',
        name: 'Trip',
        type: 'SECTION',
        children: [{ id: '2:2', name: 'Default', type: 'SECTION', children: [frame] }],
      },
    ],
  };
  const empty = { components: {}, componentSets: {}, styles: {} };
  const answers = {
    file: { version: '1', document: { id: '0:0', name: 'Document', type: 'DOCUMENT', children: [page] }, ...empty },
    nodes: { version: '1', nodes: { '1:1': { document: frame, ...empty } } },
  };
  const stub = join(cwd, 'figma-stub.mjs');
  writeFileSync(
    stub,
    `const answers = ${JSON.stringify(answers)};\nglobalThis.fetch = async (url) => new Response(JSON.stringify(String(url).includes('/nodes?') ? answers.nodes : answers.file), { status: 200 });\n`,
  );
  return { cwd, env: { FIGMA_TOKEN: 'stub', NODE_OPTIONS: `--import ${stub}` } };
}

const drew = [typed('draw it'), called('mcp__plugin_figma_figma__use_figma'), result()];

test('a turn whose drawing passes the checks ends, with its outline written', () => {
  const { cwd, env } = figmaRepo('    title: Trip\n    root: true\n    states: [Default]\n');
  assert.equal(stop(cwd, drew, 'pass', env), null);
  assert.equal(existsSync(join(cwd, 'docs', 'design', 'outline', 'trips', 'trip.yaml')), true);
});

test('a turn whose drawing fails a check is blocked with the findings', () => {
  const { cwd, env } = figmaRepo('    title: Trip\n    states: [Default]\n');
  const reply = stop(cwd, drew, 'fail', env);
  assert.equal(reply?.decision, 'block');
  assert.match(reply.reason, /FAIL reachability trips\/trip entry: a screen that is not a root has no entry/);
});

test('a drawing that keeps failing is blocked three times at most in one turn', () => {
  const { cwd, env } = figmaRepo('    title: Trip\n    states: [Default]\n');
  for (let attempt = 0; attempt < 3; attempt += 1) assert.equal(stop(cwd, drew, 'capped', env)?.decision, 'block');
  assert.match(stop(cwd, drew, 'capped', env)?.systemMessage ?? '', /still fails after 3 attempts/);
  assert.equal(
    stop(cwd, [...drew, typed('again'), called('mcp__plugin_figma_figma__use_figma')], 'capped', env)?.decision,
    'block',
  );
});
