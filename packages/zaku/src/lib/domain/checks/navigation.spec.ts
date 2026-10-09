import { loadedMap, testInput, testMap } from '../../../test/fixtures.fixture.js';
import { reachability, wayBack } from './navigation.js';

const trips = testMap('trips', {
  trips: {
    title: 'Trips',
    root: true,
    states: ['Default'],
    exits: [{ to: 'trip-itinerary', via: 'tap a trip' }],
  },
  'trip-itinerary': {
    title: 'Trip itinerary',
    states: ['Default'],
    entry: [{ from: 'trips' }],
    exits: [{ to: 'trip-today', via: 'Today tab' }],
    back: { web: 'browser history, then trips' },
  },
  orphan: { title: 'Orphan', states: ['Default'] },
});

describe('reachability', () => {
  it('reports a screen with no entry and an exit to a screen no map has', () => {
    const outcome = reachability(testInput({ maps: [loadedMap(trips)] }));
    expect(outcome).toEqual({
      findings: [
        {
          check: 'reachability',
          feature: 'trips',
          screen: 'trip-itinerary',
          field: 'exits',
          message: 'exit to trip-today names no screen',
        },
        {
          check: 'reachability',
          feature: 'trips',
          screen: 'orphan',
          field: 'entry',
          message: 'a screen that is not a root has no entry',
        },
      ],
    });
  });
});

describe('wayBack', () => {
  it('reports each platform family a non-root screen targets without a way back', () => {
    const outcome = wayBack(testInput({ maps: [loadedMap(trips)] }));
    expect(outcome).toEqual({
      findings: [
        {
          check: 'way-back',
          feature: 'trips',
          screen: 'trip-itinerary',
          field: 'back.ios',
          message: 'no way back on ios',
        },
        {
          check: 'way-back',
          feature: 'trips',
          screen: 'orphan',
          field: 'back.web',
          message: 'no way back on web',
        },
        {
          check: 'way-back',
          feature: 'trips',
          screen: 'orphan',
          field: 'back.ios',
          message: 'no way back on ios',
        },
      ],
    });
  });
});
