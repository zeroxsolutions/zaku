import {
  loadedMap,
  testFrame,
  testInput,
  testInstance,
  testLibrary,
  testMap,
  testOutline,
} from '../../../test/fixtures.fixture.js';
import { libraryCheck } from './library.js';

describe('libraryCheck', () => {
  it('does not run without a library snapshot', () => {
    expect(libraryCheck(testInput())).toEqual({ notRun: 'library.json is missing' });
  });

  it('reports a map component, an instance and a raw node the library does not publish', () => {
    const map = testMap('trips', {
      trips: {
        title: 'Trips',
        root: true,
        states: ['Default'],
        components: ['Button', 'Carousel'],
      },
    });
    const frame = testFrame({
      instances: [testInstance(), testInstance({ nodeId: '11:1', component: 'Fancy', componentKey: 'local-fancy' })],
      raw: [
        {
          nodeId: '12:1',
          name: 'Rectangle 4',
          type: 'RECTANGLE',
          reason: 'a shape outside the library',
          signature: 'RECTANGLE',
        },
      ],
    });
    const outcome = libraryCheck(
      testInput({
        maps: [loadedMap(map)],
        outlines: [testOutline({ frames: [frame] })],
        library: testLibrary(),
      }),
    );
    expect(outcome).toEqual({
      findings: [
        {
          check: 'library',
          feature: 'trips',
          screen: 'trips',
          field: 'components',
          message: 'Carousel is not a library component',
        },
        {
          check: 'library',
          feature: 'trips',
          screen: 'trips',
          frame: 'Trips / Default / Desktop',
          nodeId: '11:1',
          message: 'an instance of Fancy is not a published library variant',
        },
        {
          check: 'library',
          feature: 'trips',
          screen: 'trips',
          frame: 'Trips / Default / Desktop',
          nodeId: '12:1',
          message: 'a shape outside the library (RECTANGLE "Rectangle 4")',
        },
      ],
    });
  });
});

describe('libraryCheck, on what a product draws itself', () => {
  it('passes a product component and a system bar, and accepts the product component in the map', () => {
    const map = testMap('trips', {
      trips: {
        title: 'Trips',
        root: true,
        states: ['Default'],
        components: ['Button', 'Trip card'],
      },
    });
    const frame = testFrame({
      target: 'ios-phone',
      instances: [
        testInstance({
          nodeId: '11:1',
          component: 'Trip card',
          componentKey: 'own-card',
          local: true,
        }),
        testInstance({
          nodeId: '11:2',
          component: 'Status Bar',
          componentKey: 'kit-status',
          interactive: false,
        }),
      ],
    });
    expect(
      libraryCheck(
        testInput({
          maps: [loadedMap(map)],
          outlines: [testOutline({ frames: [frame] })],
          library: testLibrary(),
        }),
      ),
    ).toEqual({ findings: [] });
  });
});
