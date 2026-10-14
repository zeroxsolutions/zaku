import type { VariablePart } from './library.js';
import { mergeParts } from './library-parts.js';

const part = (exportedAt: string, ids: string[]): VariablePart => ({
  exportedAt,
  variables: { a: 'color/primary' },
  textStyles: [],
  tokens: [],
  components: ids.map((id) => ({ id, key: `k-${id}`, name: id, page: `p-${id}`, description: '', set: false })),
});

describe('mergeParts', () => {
  it('joins the components every page export listed, once each, to the first export', () => {
    expect(mergeParts([part('t1', ['9:1']), part('t2', ['9:2', '9:1'])])).toEqual({
      ...part('t1', ['9:1', '9:2']),
    });
  });

  it('leaves one export as it is', () => {
    const only = { ...part('t1', []), components: undefined };
    expect(mergeParts([only])).toBe(only);
  });
});
