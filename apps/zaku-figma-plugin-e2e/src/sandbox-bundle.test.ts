import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'vitest';

// Figma evaluates main.js as a script and rejects one whose text holds an import, a comment's included.
const bundle = readFileSync(
  join(import.meta.dirname, '..', '..', 'zaku-figma-plugin', 'dist-sandbox', 'main.js'),
  'utf8',
);

test('the sandbox bundle holds no text Figma reads as an import', () => {
  assert.equal(bundle.match(/\bimport\s*\(/)?.[0], undefined);
  assert.equal(bundle.match(/^\s*(import|export)\s/m)?.[0], undefined);
});

test('the manifest asks for every permission the sandbox uses', () => {
  const manifest = JSON.parse(
    readFileSync(join(import.meta.dirname, '..', '..', 'zaku-figma-plugin', 'manifest.json'), 'utf8'),
  ) as {
    permissions?: string[];
  };
  // Without it, reading figma.currentUser throws, and the hello that opens a session is never sent.
  if (bundle.includes('currentUser')) assert.ok(manifest.permissions?.includes('currentuser'));
});
