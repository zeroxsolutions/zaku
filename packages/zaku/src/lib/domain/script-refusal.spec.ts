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
});
