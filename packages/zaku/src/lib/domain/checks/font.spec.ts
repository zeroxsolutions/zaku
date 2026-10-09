import { testFrame, testInput, testLibrary, testOutline } from '../../../test/fixtures.fixture.js';
import { font } from './font.js';

describe('font', () => {
  it('reports text outside a component with no text style or a style the library does not have', () => {
    const frame = testFrame({
      texts: [
        { nodeId: '5:1', characters: 'Your trips', styleKey: 'style-sm' },
        { nodeId: '5:2', characters: 'Plan one', styleKey: null },
        { nodeId: '5:3', characters: 'Hi', styleKey: 'local-style' },
      ],
    });
    expect(font(testInput({ library: testLibrary(), outlines: [testOutline({ frames: [frame] })] }))).toEqual({
      findings: [
        {
          check: 'font',
          feature: 'trips',
          screen: 'trips',
          frame: 'Trips / Default / Desktop',
          nodeId: '5:2',
          message: 'text outside a component uses no library text style',
        },
        {
          check: 'font',
          feature: 'trips',
          screen: 'trips',
          frame: 'Trips / Default / Desktop',
          nodeId: '5:3',
          message: 'text uses a style the library does not publish',
        },
      ],
    });
  });
});
