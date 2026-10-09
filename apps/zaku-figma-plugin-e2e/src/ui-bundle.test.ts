import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'vitest';

// Figma loads the UI as one document from the manifest's `ui` path; nothing it links to is fetched.
const html = readFileSync(join(import.meta.dirname, '..', '..', 'zaku-figma-plugin', 'dist', 'index.html'), 'utf8');

test('the panel carries every script and stylesheet inline', () => {
  assert.equal(html.match(/<script[^>]*\ssrc=/)?.[0], undefined);
  assert.equal(html.match(/<link[^>]*rel="stylesheet"/)?.[0], undefined);
});

test("the panel takes its colours from Figma's theme", () => {
  assert.ok(html.includes('--figma-color-bg'));
});

test("the panel's error text takes Figma's danger text colour, not its danger fill", () => {
  assert.ok(html.includes('--figma-color-text-danger'));
  assert.equal(html.match(/var\(--figma-color-bg-danger\)/)?.[0], undefined);
});
