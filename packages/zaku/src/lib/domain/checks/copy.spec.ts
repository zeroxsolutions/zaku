import {
  loadedMap,
  testConfig,
  testFrame,
  testInput,
  testInstance,
  testMap,
  testOutline,
} from '../../../test/fixtures.fixture.js';
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

describe('copy, on the characters and the tone of authored content', () => {
  const where = { check: 'copy', feature: 'trips', screen: 'trips', frame: 'Trips / Default / Desktop' };

  it('holds text outside instances and a characters override to the rules, and never a library default', () => {
    const frame = testFrame({
      texts: [{ nodeId: '5:1', characters: 'Hoi An \u2014 tickets', styleKey: 's' }],
      instances: [
        testInstance({ texts: [{ nodeId: '10:2', path: 'Label', characters: "Let's go \u2192" }] }),
        testInstance({
          nodeId: '11:1',
          overrides: [{ nodeId: '11:2', fields: ['characters'] }],
          texts: [{ nodeId: '11:2', path: 'Label', characters: 'Unlock booking \u2192' }],
        }),
      ],
    });
    expect(copy(testInput({ maps: [loadedMap(map)], outlines: [testOutline({ frames: [frame] })] }))).toEqual({
      findings: [
        { ...where, nodeId: '5:1', field: 'characters', message: 'U+2014 em dash: write "-", or two sentences' },
        { ...where, nodeId: '11:2', field: 'tone', message: '"Unlock": write "get" or "open"' },
      ],
    });
  });

  it('allows the letters and currency symbols of the locales and currencies the config names', () => {
    const frame = testFrame({
      texts: [{ nodeId: '5:1', characters: 'V\u00e9 v\u00e0o c\u1eeda 120.000 \u20ab', styleKey: 's' }],
    });
    const input = (copySection: unknown): Parameters<typeof copy>[0] =>
      testInput({
        config: testConfig({ copy: copySection }),
        maps: [loadedMap(map)],
        outlines: [testOutline({ frames: [frame] })],
      });
    expect(copy(input({ locales: ['en', 'vi'], currencies: ['VND'] }))).toEqual({ findings: [] });
    expect(copy(input(undefined))).toMatchObject({
      findings: [{ nodeId: '5:1', field: 'characters', message: expect.stringMatching(/^U\+20AB /) }],
    });
  });
});
