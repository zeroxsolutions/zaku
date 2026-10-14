import { zakuRules, REPLY_BYTES } from './rules-script.js';

const screens = { id: '0:2', name: 'Screens', type: 'PAGE', parent: null };
const unbound = (id: string): Record<string, unknown> => ({
  id,
  name: `Card ${id}`,
  type: 'FRAME',
  parent: screens,
  fills: [{ type: 'SOLID', visible: true, opacity: 1, boundVariables: {} }],
  strokes: [],
});
interface FakePage {
  id: string;
  name: string;
  type: 'PAGE';
  findAll: () => unknown[];
}
const page = (id: string, name: string, children: unknown[]): FakePage => ({
  id,
  name,
  type: 'PAGE',
  findAll: (): unknown[] => children,
});

/** The Plugin API as use_figma hands it in: every page in root, the first one current. */
function fakeFigma(pages: FakePage[]): Record<string, unknown> {
  let current = pages[0];
  return {
    mixed: Symbol('mixed'),
    root: { children: pages },
    get currentPage(): FakePage | undefined {
      return current;
    },
    setCurrentPageAsync: async (next: FakePage): Promise<void> => {
      current = next;
    },
    getNodeByIdAsync: async (): Promise<null> => null,
  };
}

/** English with no currency, resolved as the CLI resolves it before printing the script. */
const english = { scripts: ['Latn'], symbols: [], languages: ['en'] };

describe('zakuRules', () => {
  it('checks the page it is named, by name or id, under the copy it is given', async () => {
    const figma = fakeFigma([page('0:1', 'Cover', []), page('0:2', 'Screens', [unbound('1:1')])]);
    expect(await zakuRules(figma, { scope: { page: 'Screens' }, copy: english })).toMatchObject({
      checked: 1,
      total: 1,
      counts: { binding: 1 },
      findings: [{ check: 'binding', nodeId: '1:1' }],
      cut: false,
    });
    const other = fakeFigma([page('0:1', 'Cover', []), page('0:2', 'Screens', [unbound('1:1')])]);
    expect((await zakuRules(other, { scope: { page: '0:2' }, copy: english })).checked).toBe(1);
  });

  it('answers a page of thousands of findings in a reply use_figma returns whole, with every one counted', async () => {
    const many = Array.from({ length: 4000 }, (_, i) => unbound(`1:${i}`));
    const figma = fakeFigma([page('0:2', 'Screens', many)]);
    const result = await zakuRules(figma, { scope: { page: 'Screens' }, copy: english });
    expect(result.total).toBe(4000);
    expect(result.counts['binding']).toBe(4000);
    expect(result.cut).toBe(true);
    expect(result.findings.length).toBeGreaterThan(0);
    expect(new TextEncoder().encode(JSON.stringify(result)).length).toBeLessThanOrEqual(REPLY_BYTES);
  });

  it('runs with no Intl, as the use_figma sandbox has none', async () => {
    vi.stubGlobal('Intl', undefined);
    try {
      const figma = fakeFigma([page('0:2', 'Screens', [unbound('1:1')])]);
      expect((await zakuRules(figma, { scope: { page: 'Screens' }, copy: english })).total).toBe(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('refuses a page it cannot find, naming the pages there are', async () => {
    const figma = fakeFigma([page('0:1', 'Cover', [])]);
    await expect(zakuRules(figma, { scope: { page: 'Nope' }, copy: english })).rejects.toThrow(
      'no page Nope; the pages are Cover',
    );
  });
});
