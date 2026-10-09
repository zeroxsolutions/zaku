#!/usr/bin/env node
// Stop: a turn that wrote to the drawing ends only when `zaku check` passes.
//
// It outlines the product file again and runs the checks through the plugin's own bundled zaku,
// never one it downloads. It blocks at most three times in one turn, so a check the agent cannot
// satisfy does not burn the call budget, and any failure to read what it needs lets the turn end.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_BLOCKS = 3;
const pluginRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const zaku = join(pluginRoot, 'bin', 'zaku.mjs');

/** Figma's write tool, use_figma, under whatever server prefix the session gave it. */
export function isDrawingWrite(name) {
  return typeof name === 'string' && /(^|__)use_figma$/.test(name);
}

/** The tool calls of the last turn: everything after the last message a person typed. */
export function lastTurnToolCalls(lines) {
  const entries = lines.flatMap((line) => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
  let start = 0;
  entries.forEach((entry, index) => {
    const content = entry?.message?.content;
    const typed =
      entry?.type === 'user' &&
      (typeof content === 'string' || (Array.isArray(content) && content.some((part) => part?.type === 'text')));
    if (typed) start = index;
  });
  const turnId = entries[start]?.uuid ?? String(start);
  const calls = entries
    .slice(start)
    .filter((entry) => entry?.type === 'assistant' && Array.isArray(entry.message?.content))
    .flatMap((entry) => entry.message.content.filter((part) => part?.type === 'tool_use').map((part) => part.name));
  return { turnId, calls };
}

function run(args, cwd) {
  const result = spawnSync(process.execPath, [zaku, ...args], {
    cwd,
    encoding: 'utf8',
    timeout: 240_000,
    env: process.env,
  });
  return { code: result.status ?? 1, out: `${result.stdout ?? ''}${result.stderr ?? ''}`.trim() };
}

function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return;
  }
  const cwd = typeof input.cwd === 'string' ? input.cwd : process.cwd();
  if (!existsSync(join(cwd, 'docs', 'design', 'zaku.yaml')) || !existsSync(zaku)) return;
  let lines;
  try {
    lines = readFileSync(input.transcript_path, 'utf8').split('\n');
  } catch {
    return;
  }
  const { turnId, calls } = lastTurnToolCalls(lines);
  const writes = calls.filter(isDrawingWrite);
  if (writes.length === 0) return;

  const statePath = join(tmpdir(), `zaku-stop-${String(input.session_id ?? 'session').replace(/[^\w-]/g, '')}.json`);
  let state = { turnId: null, blocks: 0 };
  try {
    state = JSON.parse(readFileSync(statePath, 'utf8'));
  } catch {
    // A first stop in this session starts its own count.
  }
  if (state.turnId !== turnId) {
    state = { turnId, blocks: 0 };
    run(['budget', 'record', '--kind', 'mcp', '--count', String(writes.length)], cwd);
  }
  const save = () => writeFileSync(statePath, JSON.stringify(state));
  const block = (reason) => {
    state.blocks += 1;
    save();
    process.stdout.write(JSON.stringify({ decision: 'block', reason }) + '\n');
  };
  if (state.blocks >= MAX_BLOCKS) {
    save();
    process.stdout.write(
      JSON.stringify({
        systemMessage: `zaku check still fails after ${MAX_BLOCKS} attempts this turn; the findings are left for a person.`,
      }) + '\n',
    );
    return;
  }

  const budget = run(['budget', 'status'], cwd);
  if (budget.code === 4) {
    save();
    process.stdout.write(JSON.stringify({ systemMessage: `zaku check not run: ${budget.out}` }) + '\n');
    return;
  }
  const outline = run(['outline'], cwd);
  if (outline.code !== 0) {
    // A missing token or an unreachable file is not the drawing's fault, and no retry by the agent fixes it.
    save();
    process.stdout.write(JSON.stringify({ systemMessage: `zaku check not run: ${outline.out}` }) + '\n');
    return;
  }
  const check = run(['check'], cwd);
  if (check.code === 1) {
    block(
      `zaku check fails on the drawing this turn wrote. Fix each finding, by its node id, then stop again:\n${check.out}`,
    );
    return;
  }
  save();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
