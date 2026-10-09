#!/usr/bin/env node
// SessionStart: in a repository whose design lives under docs/design, say how it is read.
//
// Nothing else leads a session to the design skills. A repository without docs/design/zaku.yaml gets nothing.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

let cwd = process.cwd();
try {
  const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
  if (typeof input.cwd === 'string') cwd = input.cwd;
} catch {
  // No input is a session started by hand; the working directory stands in for it.
}

if (!existsSync(join(cwd, 'docs', 'design', 'zaku.yaml'))) process.exit(0);

const context = [
  "This repository's design lives as data under docs/design, and the zaku plugin's skills govern",
  'design work here: reach for them before reading, mapping, drawing or reviewing a screen.',
  'Read it in this order and stop at the first that answers: docs/design/zaku.yaml, then',
  'docs/design/map/<feature>.yaml, then docs/design/outline/<feature>/<screen>.yaml, then one frame of',
  'the drawing by its id. The drawing is never read whole.',
  // The skills name `zaku <command>`; the plugin carries the checker, so a repository needs no install.
  `\`zaku\` in a skill is \`node "${join(dirname(dirname(fileURLToPath(import.meta.url))), 'bin', 'zaku.mjs')}"\`, run from the repository root.`,
].join('\n');

// The output field is per-harness, and the wrong one injects nothing while exiting 0.
const payload = process.env.CLAUDE_PLUGIN_ROOT
  ? { hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: context } }
  : { additional_context: context };

process.stdout.write(JSON.stringify(payload) + '\n');
