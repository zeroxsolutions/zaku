import { loadedMap, testFrame, testInput, testInstance, testMap, testOutline } from '../../../test/fixtures.fixture.js';
import { copy } from './copy.js';

const map = testMap('trips', { trips: { title: 'Trips', root: true, states: ['Default'] } });

describe('copy', () => {
  it('reports empty text and placeholder copy', () => {
    const frame = testFrame({
      texts: [{ nodeId: '5:1', characters: '  ', styleKey: 's' }],
      instances: [
        testInstance({
          texts: [{ nodeId: '10:2', path: 'Label', characters: 'Lorem ipsum dolor' }],
        }),
      ],
    });
    expect(copy(testInput({ maps: [loadedMap(map)], outlines: [testOutline({ frames: [frame] })] }))).toEqual({
      findings: [
        {
          check: 'copy',
          feature: 'trips',
          screen: 'trips',
          frame: 'Trips / Default / Desktop',
          nodeId: '5:1',
          message: 'empty text',
        },
        {
          check: 'copy',
          feature: 'trips',
          screen: 'trips',
          frame: 'Trips / Default / Desktop',
          nodeId: '10:2',
          message: 'placeholder copy: Lorem ipsum dolor',
        },
      ],
    });
  });

  it('reports copy that differs between targets of one state, unless the map says why', () => {
    const outline = testOutline({
      frames: [
        testFrame({ texts: [{ nodeId: '5:1', characters: 'Your trips', styleKey: 's' }] }),
        testFrame({
          nodeId: '2:1',
          name: 'Trips / Default / iPhone',
          target: 'ios-phone',
          texts: [{ nodeId: '6:1', characters: 'Trips', styleKey: 's' }],
        }),
      ],
    });
    expect(copy(testInput({ maps: [loadedMap(map)], outlines: [outline] }))).toEqual({
      findings: [
        {
          check: 'copy',
          feature: 'trips',
          screen: 'trips',
          field: 'Default',
          message: 'copy differs between web-desktop, ios-phone in state Default',
        },
      ],
    });
    const varies = testMap('trips', {
      trips: {
        title: 'Trips',
        root: true,
        states: ['Default'],
        'copy-varies': 'iOS uses the shorter tab label',
      },
    });
    expect(copy(testInput({ maps: [loadedMap(varies)], outlines: [outline] }))).toEqual({
      findings: [],
    });
  });
});

describe('copy, around system bars and real words', () => {
  it('leaves the clock in a status bar out of the comparison between targets', () => {
    const bar = (nodeId: string, time: string): ReturnType<typeof testInstance> =>
      testInstance({
        nodeId,
        component: 'Status Bar',
        interactive: false,
        texts: [{ nodeId: `${nodeId}/t`, path: 'Time', characters: time }],
      });
    const outline = testOutline({
      frames: [
        testFrame({
          target: 'ios-phone',
          texts: [{ nodeId: '5:1', characters: 'Your trips', styleKey: 's' }],
          instances: [bar('b1', '9:41')],
        }),
        testFrame({
          nodeId: '2:1',
          target: 'web-desktop',
          texts: [{ nodeId: '6:1', characters: 'Your trips', styleKey: 's' }],
        }),
      ],
    });
    expect(copy(testInput({ maps: [loadedMap(map)], outlines: [outline] }))).toEqual({
      findings: [],
    });
  });

  it('takes a word a product really shows, such as Title or Value, as copy', () => {
    const frame = testFrame({
      texts: ['Title', 'Description', 'Heading', 'Value'].map((characters, i) => ({
        nodeId: `5:${i}`,
        characters,
        styleKey: 's',
      })),
    });
    expect(copy(testInput({ maps: [loadedMap(map)], outlines: [testOutline({ frames: [frame] })] }))).toEqual({
      findings: [],
    });
  });
});
