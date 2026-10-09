import { loadedMap, testFrame, testInput, testMap, testOutline } from '../../../test/fixtures.fixture.js';
import { coverage } from './coverage.js';

const map = testMap('trips', {
  trips: {
    title: 'Trips',
    root: true,
    states: ['Default', 'Empty'],
    omits: { 'ios-phone': 'web first' },
  },
});

describe('coverage', () => {
  it('reports each state and target with no frame, each frame the map does not name, and each unmapped frame', () => {
    const outline = testOutline({
      frames: [testFrame(), testFrame({ nodeId: '1:9', name: 'Trips / Loading / Desktop', state: 'Loading' })],
    });
    const outcome = coverage(
      testInput({
        maps: [loadedMap(map)],
        outlines: [outline],
        unmapped: [{ nodeId: '7:7', name: 'Trps / Default / Desktop' }],
      }),
    );
    expect(outcome).toEqual({
      findings: [
        {
          check: 'coverage',
          feature: 'trips',
          screen: 'trips',
          frame: 'Trips / Loading / Desktop',
          nodeId: '1:9',
          message: 'a drawn frame has no state and target in the map',
        },
        {
          check: 'coverage',
          feature: 'trips',
          screen: 'trips',
          frame: 'Trips / Empty / Desktop',
          message: 'no frame drawn for this state and target',
        },
        {
          check: 'coverage',
          frame: 'Trps / Default / Desktop',
          nodeId: '7:7',
          message: 'a frame name resolves to no screen in the map',
        },
      ],
    });
  });

  it('tells two features apart when they share a title', () => {
    const home = (feature: string): ReturnType<typeof testMap> =>
      testMap(feature, {
        home: { title: 'Home', root: true, states: ['Default'], targets: ['web-desktop'] },
      });
    const drawn = testOutline({
      feature: 'a',
      screen: 'home',
      frames: [testFrame({ name: 'Home / Default / Desktop' })],
    });
    const outcome = coverage(testInput({ maps: [loadedMap(home('a')), loadedMap(home('b'))], outlines: [drawn] }));
    expect(outcome).toEqual({
      findings: [
        {
          check: 'coverage',
          feature: 'b',
          screen: 'home',
          frame: 'Home / Default / Desktop',
          message: 'no frame drawn for this state and target',
        },
      ],
    });
  });

  it('reports a target id the config does not declare as a schema finding', () => {
    const bad = testMap('trips', {
      trips: { title: 'Trips', root: true, states: ['Default'], targets: ['web-desktop', 'tv'] },
    });
    const outcome = coverage(testInput({ maps: [loadedMap(bad)], outlines: [testOutline({ frames: [testFrame()] })] }));
    expect(outcome).toEqual({
      findings: [
        {
          check: 'schema',
          feature: 'trips',
          screen: 'trips',
          field: 'targets',
          message: 'unknown target tv',
        },
      ],
    });
  });
});

describe('coverage, on a name drawn twice', () => {
  it('reports two frames of one feature that share a name', () => {
    const one = testMap('trips', {
      trips: { title: 'Trips', root: true, states: ['Default'], targets: ['web-desktop'] },
    });
    const outline = testOutline({ frames: [testFrame(), testFrame({ nodeId: '1:2' })] });
    expect(coverage(testInput({ maps: [loadedMap(one)], outlines: [outline] }))).toEqual({
      findings: [
        {
          check: 'coverage',
          feature: 'trips',
          screen: 'trips',
          frame: 'Trips / Default / Desktop',
          nodeId: '1:2',
          message: 'another frame, 1:1, has this name',
        },
      ],
    });
  });
});
