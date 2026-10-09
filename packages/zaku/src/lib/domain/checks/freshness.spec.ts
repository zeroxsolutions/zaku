import { loadedMap, testInput, testLibrary, testMap, testOutline } from '../../../test/fixtures.fixture.js';
import { freshness } from './freshness.js';

const map = loadedMap(testMap('trips', { trips: { title: 'Trips', root: true, states: ['Default'] } }));

describe('freshness', () => {
  it('passes an outline read against the current map and library', () => {
    const outline = testOutline({ mapDigest: map.digest, libraryVersion: 'v1' });
    expect(freshness(testInput({ maps: [map], outlines: [outline], library: testLibrary() }))).toEqual({
      findings: [],
    });
  });

  it('reports an outline read before the map or the library changed', () => {
    const outline = testOutline({ mapDigest: 'old', libraryVersion: 'v0' });
    expect(freshness(testInput({ maps: [map], outlines: [outline], library: testLibrary() }))).toEqual({
      findings: [
        {
          check: 'freshness',
          feature: 'trips',
          screen: 'trips',
          message: 'the map changed after this outline was read; run zaku outline',
        },
        {
          check: 'freshness',
          feature: 'trips',
          screen: 'trips',
          message: 'the library changed after this outline was read; run zaku outline',
        },
      ],
    });
  });
});
