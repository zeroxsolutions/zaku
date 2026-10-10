import { refusedCalls } from './script-refusal.js';

describe('refusedCalls', () => {
  it('names each call that would close, notify, load every page or move the page', () => {
    const script = `
      figma.notify('hi');
      await figma.loadAllPagesAsync();
      figma.currentPage = figma.root.children[1];
      figma.closePlugin();
    `;
    expect(refusedCalls(script)).toEqual([
      'figma.closePlugin',
      'figma.notify',
      'figma.loadAllPagesAsync',
      'setting figma.currentPage',
    ]);
  });

  it('lets a comparison with the current page through', () => {
    expect(refusedCalls('if (node.parent === figma.currentPage) return 1;')).toEqual([]);
    expect(refusedCalls('const page = figma.currentPage; return page.name;')).toEqual([]);
  });

  it('refuses code built from a string at run time, which no refusal can read', () => {
    const script = `
      const H = await (new Function('figma', 'return (async () => {' + figma.root.getPluginData('H') + '})()'))(figma);
      const run = Function('return 1');
      eval(await figma.clientStorage.getAsync('zakuH'));
      const A = Object.getPrototypeOf(async () => {}).constructor;
    `;
    expect(refusedCalls(script)).toEqual(['new Function', 'Function()', 'eval()', 'the Function constructor']);
  });

  it('lets a name that only contains those words through', () => {
    expect(refusedCalls('const evaluate = (f) => f; const myFunction = () => 1; return evaluate(myFunction);')).toEqual(
      [],
    );
  });

  it('refuses a style id or vector network assigned, which a dynamic-page file only takes through its async setter', () => {
    const script = `
      t.textStyleId = style.id;
      frame.fillStyleId = fill.id;
      frame.strokeStyleId = '';
      frame.effectStyleId = shadow.id;
      frame.gridStyleId = grid.id;
      vector.vectorNetwork = network;
      frame.reactions = [];
    `;
    expect(refusedCalls(script)).toEqual([
      'setting textStyleId (use setTextStyleIdAsync)',
      'setting fillStyleId (use setFillStyleIdAsync)',
      'setting strokeStyleId (use setStrokeStyleIdAsync)',
      'setting effectStyleId (use setEffectStyleIdAsync)',
      'setting gridStyleId (use setGridStyleIdAsync)',
      'setting vectorNetwork (use setVectorNetworkAsync)',
      'setting reactions (use setReactionsAsync)',
    ]);
    expect(refusedCalls('if (t.textStyleId === style.id) await t.setTextStyleIdAsync(style.id);')).toEqual([]);
  });
});
