import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  documentationMeasuresBlock,
  MEASURES_BLOCK_END,
  MEASURES_BLOCK_START,
} from './documentation-measures-table.js';

const REFERENCE = fileURLToPath(
  new URL('../../../../../plugins/zaku/skills/building-the-library/references/figma.md', import.meta.url),
);

describe("the documentation's measures table", () => {
  it("is printed in building-the-library's Figma reference as the documentation rule reads it", () => {
    const text = readFileSync(REFERENCE, 'utf8');
    const start = text.indexOf(MEASURES_BLOCK_START);
    const end = text.indexOf(MEASURES_BLOCK_END);
    expect(start).toBeGreaterThan(-1);
    expect(text.slice(start, end + MEASURES_BLOCK_END.length)).toBe(documentationMeasuresBlock());
  });

  it('prints plain ASCII', () => {
    expect(documentationMeasuresBlock()).toMatch(/^[\x20-\x7e\n]*$/);
  });
});
