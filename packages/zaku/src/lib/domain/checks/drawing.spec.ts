import {
  loadedMap,
  testConfig,
  testFrame,
  testInput,
  testInstance,
  testMap,
  testOutline,
} from '../../../test/fixtures.fixture.js';
import { component, frameCheck, images, naming, placement, systemBars } from './drawing.js';

const FRAME = 'Trips / Default / Desktop';
const where = { feature: 'trips', screen: 'trips', frame: FRAME };

describe('images', () => {
  it('reports a layer named for a picture that holds no image', () => {
    const frame = testFrame({
      images: [
        { nodeId: '4:6', name: 'Hero photo', filled: true },
        { nodeId: '4:7', name: 'Cover photo', filled: false },
      ],
    });
    expect(images(testInput({ outlines: [testOutline({ frames: [frame] })] }))).toEqual({
      findings: [
        {
          check: 'images',
          ...where,
          nodeId: '4:7',
          message: 'Cover photo is named for a picture and holds no image',
        },
      ],
    });
  });
});

describe('frameCheck', () => {
  it('reports a frame drawn at a size other than its target, and skips a target with no size', () => {
    const config = testConfig({
      targets: [
        { id: 'web-desktop', family: 'web', name: 'Desktop', size: { width: 1440, height: 900 } },
        { id: 'ios-phone', family: 'ios', name: 'iPhone' },
      ],
    });
    const frames = [
      testFrame({ size: { width: 1280, height: 900 } }),
      testFrame({ nodeId: '2:1', target: 'ios-phone', size: { width: 1, height: 1 } }),
    ];
    expect(frameCheck(testInput({ config, outlines: [testOutline({ frames })] }))).toEqual({
      findings: [
        {
          check: 'frame',
          ...where,
          nodeId: '1:1',
          field: 'size',
          message: '1280x900 is not the web-desktop size 1440x900',
        },
      ],
    });
  });
});

describe('systemBars', () => {
  it('reports each bar a native frame lacks, and asks nothing of a web frame', () => {
    const ios = testFrame({
      nodeId: '2:1',
      name: 'Trips / Default / iPhone',
      target: 'ios-phone',
      instances: [testInstance({ component: 'Status Bar' })],
    });
    expect(systemBars(testInput({ outlines: [testOutline({ frames: [testFrame(), ios] })] }))).toEqual({
      findings: [
        {
          check: 'system-bars',
          feature: 'trips',
          screen: 'trips',
          frame: 'Trips / Default / iPhone',
          nodeId: '2:1',
          message: 'no Home Indicator instance on a ios frame',
        },
      ],
    });
  });

  it("takes a kit's own names for one family's bars, and keeps the default names for every other family", () => {
    const config = testConfig({
      targets: [
        { id: 'ios-phone', family: 'ios', name: 'iPhone' },
        { id: 'android-phone', family: 'android', name: 'Android phone' },
      ],
      systemBars: { ios: [['iOS Status Bar'], ['iOS Home Indicator']] },
    });
    const ios = testFrame({
      nodeId: '2:1',
      name: 'Trips / Default / iPhone',
      target: 'ios-phone',
      instances: [testInstance({ component: 'iOS Status Bar' }), testInstance({ component: 'iOS Home Indicator' })],
    });
    const android = testFrame({
      nodeId: '3:1',
      name: 'Trips / Default / Android phone',
      target: 'android-phone',
      instances: [testInstance({ component: 'Status Bar' })],
    });
    expect(systemBars(testInput({ config, outlines: [testOutline({ frames: [ios, android] })] }))).toEqual({
      findings: [
        {
          check: 'system-bars',
          feature: 'trips',
          screen: 'trips',
          frame: 'Trips / Default / Android phone',
          nodeId: '3:1',
          message: 'no Navigation Bar or Gesture Handle instance on a android frame',
        },
      ],
    });
  });
});

describe('placement', () => {
  const maps = [loadedMap(testMap('trips', { trips: { title: 'Trips', root: true, states: ['Default'] } }))];

  it('reports a Figma frame outside its screen and state Sections', () => {
    const frame = testFrame({ containers: ['Trips'] });
    expect(placement(testInput({ maps, outlines: [testOutline({ frames: [frame] })] }))).toEqual({
      findings: [
        {
          check: 'placement',
          ...where,
          nodeId: '1:1',
          message: 'sits in Trips, not in Trips > Default',
        },
      ],
    });
  });

  it('passes a frame in place', () => {
    expect(placement(testInput({ maps, outlines: [testOutline({ frames: [testFrame()] })] }))).toEqual({
      findings: [],
    });
  });
});

describe('naming', () => {
  it('reports a layer left with a default name', () => {
    const frame = testFrame({ defaultNames: [{ nodeId: '4:1', name: 'Rectangle 4' }] });
    expect(naming(testInput({ outlines: [testOutline({ frames: [frame] })] }))).toEqual({
      findings: [{ check: 'naming', ...where, nodeId: '4:1', message: 'Rectangle 4 keeps a default name' }],
    });
  });
});

describe('component', () => {
  it('reports a block of plain layers repeated in two frames of a screen, and not a lone shape', () => {
    const card = (
      nodeId: string,
    ): { nodeId: string; name: string; type: string; reason: string; signature: string } => ({
      nodeId,
      name: 'Card',
      type: 'FRAME',
      reason: 'a container with its own fill, stroke or effect',
      signature: 'FRAME(TEXT,TEXT)',
    });
    const shape = {
      nodeId: '9:9',
      name: 'Dot',
      type: 'ELLIPSE',
      reason: 'a shape outside the library',
      signature: 'ELLIPSE',
    };
    const frames = [
      testFrame({ raw: [card('4:3'), shape] }),
      testFrame({ nodeId: '2:1', name: 'Trips / Default / iPhone', raw: [card('5:3'), shape] }),
    ];
    expect(component(testInput({ outlines: [testOutline({ frames })] }))).toEqual({
      findings: [
        {
          check: 'component',
          ...where,
          nodeId: '4:3',
          message: 'Card repeats in 2 places as plain layers; make it a component',
        },
        {
          check: 'component',
          feature: 'trips',
          screen: 'trips',
          frame: 'Trips / Default / iPhone',
          nodeId: '5:3',
          message: 'Card repeats in 2 places as plain layers; make it a component',
        },
      ],
    });
  });
});
