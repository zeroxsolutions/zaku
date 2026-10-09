import { loadedMap, testFrame, testInput, testMap, testOutline } from '../../../test/fixtures.fixture.js';
import { prototype } from './prototype.js';

const map = loadedMap(
  testMap('trips', {
    trips: {
      title: 'Trips',
      root: true,
      states: ['Default'],
      exits: [{ to: 'trip', via: 'tap a trip' }],
    },
    trip: {
      title: 'Trip',
      states: ['Default'],
      entry: [{ from: 'trips' }],
      back: { web: 'history' },
    },
  }),
);

describe('prototype', () => {
  it('passes a root that starts a flow and connects its exit, and a screen with a Back action', () => {
    const trips = testOutline({
      frames: [testFrame({ start: true, links: [{ nodeId: '3:1', to: { nodeId: '7:1' } }] })],
    });
    const trip = testOutline({
      screen: 'trip',
      frames: [
        testFrame({
          nodeId: '7:1',
          name: 'Trip / Default / Desktop',
          links: [{ nodeId: '8:1', to: 'back' }],
        }),
      ],
    });
    expect(prototype(testInput({ maps: [map], outlines: [trips, trip] }))).toEqual({
      findings: [],
    });
  });

  it('reports a root with no start, an exit with no connection and a screen with no Back', () => {
    const trips = testOutline({ frames: [testFrame()] });
    const trip = testOutline({
      screen: 'trip',
      frames: [testFrame({ nodeId: '7:1', name: 'Trip / Default / Desktop' })],
    });
    expect(prototype(testInput({ maps: [map], outlines: [trips, trip] }))).toEqual({
      findings: [
        {
          check: 'prototype',
          feature: 'trips',
          screen: 'trips',
          message: 'a root screen has no flow starting point',
        },
        {
          check: 'prototype',
          feature: 'trips',
          screen: 'trips',
          field: 'exits',
          message: 'the exit to trip (tap a trip) has no connection',
        },
        {
          check: 'prototype',
          feature: 'trips',
          screen: 'trip',
          message: 'a screen that is not a root has no Back action',
        },
      ],
    });
  });
});

describe('prototype, per target', () => {
  it('reports a root that starts a flow on one target and not on another it is drawn for', () => {
    const trips = testOutline({
      frames: [
        testFrame({ start: true, links: [{ nodeId: '3:1', to: { nodeId: '7:1' } }] }),
        testFrame({
          nodeId: '1:2',
          name: 'Trips / Default / iPhone',
          target: 'ios-phone',
          links: [{ nodeId: '3:2', to: { nodeId: '7:1' } }],
        }),
      ],
    });
    const trip = testOutline({
      screen: 'trip',
      frames: [
        testFrame({
          nodeId: '7:1',
          name: 'Trip / Default / Desktop',
          links: [{ nodeId: '8:1', to: 'back' }],
        }),
      ],
    });
    expect(prototype(testInput({ maps: [map], outlines: [trips, trip] }))).toEqual({
      findings: [
        {
          check: 'prototype',
          feature: 'trips',
          screen: 'trips',
          frame: 'Trips / Default / iPhone',
          nodeId: '1:2',
          message: 'a root screen starts no flow on ios-phone',
        },
      ],
    });
  });
});
