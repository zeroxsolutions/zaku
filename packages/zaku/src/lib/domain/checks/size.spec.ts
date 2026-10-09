import type { InstanceOutline } from '../outline.js';
import { testFrame, testInput, testInstance, testLibrary, testOutline } from '../../../test/fixtures.fixture.js';
import { overlap, targetSize } from './size.js';

function frameWith(target: string, ...instances: ReturnType<typeof testInstance>[]): ReturnType<typeof testOutline> {
  return testOutline({ frames: [testFrame({ target, name: 'x', instances })] });
}

describe('targetSize', () => {
  it('passes a web control at 24 px and a library component at its own preset size', () => {
    const web = testInstance({
      bounds: { x: 0, y: 0, width: 24, height: 24 },
      componentKey: 'other',
    });
    const preset = testInstance({ nodeId: '10:9', bounds: { x: 40, y: 0, width: 80, height: 32 } });
    const outlines = [frameWith('web-desktop', web), frameWith('ios-phone', preset)];
    expect(targetSize(testInput({ library: testLibrary(), outlines }))).toEqual({ findings: [] });
  });

  it('reports an iOS control under 44 pt that is not at its preset size', () => {
    const small = testInstance({ bounds: { x: 0, y: 0, width: 40, height: 28 } });
    expect(targetSize(testInput({ library: testLibrary(), outlines: [frameWith('ios-phone', small)] }))).toEqual({
      findings: [
        {
          check: 'target-size',
          feature: 'trips',
          screen: 'trips',
          frame: 'x',
          nodeId: '10:1',
          message: '40x28 is under 44x44 on ios',
        },
      ],
    });
  });
});

describe('overlap', () => {
  it('reports two interactive instances that intersect, and not two that touch', () => {
    const a = testInstance({ nodeId: 'a', bounds: { x: 0, y: 0, width: 80, height: 32 } });
    const touching = testInstance({ nodeId: 'b', bounds: { x: 80, y: 0, width: 80, height: 32 } });
    const over = testInstance({ nodeId: 'c', bounds: { x: 70, y: 10, width: 80, height: 32 } });
    expect(overlap(testInput({ outlines: [frameWith('web-desktop', a, touching)] }))).toEqual({
      findings: [],
    });
    expect(overlap(testInput({ outlines: [frameWith('web-desktop', a, over)] }))).toEqual({
      findings: [
        {
          check: 'overlap',
          feature: 'trips',
          screen: 'trips',
          frame: 'x',
          nodeId: 'a',
          message: 'overlaps c',
        },
      ],
    });
  });
});

describe('targetSize and overlap, on controls inside a component', () => {
  const nested = (
    nodeId: string,
    bounds: { x: number; y: number; width: number; height: number },
  ): InstanceOutline['nested'][number] => ({
    nodeId,
    path: 'Back',
    componentKey: 'other',
    component: 'Button',
    interactive: true,
    bounds,
  });

  it('measures a control a product component wraps', () => {
    const card = testInstance({
      component: 'Trip card',
      interactive: false,
      local: true,
      nested: [nested('c/1', { x: 8, y: 8, width: 24, height: 24 })],
    });
    expect(targetSize(testInput({ library: testLibrary(), outlines: [frameWith('ios-phone', card)] }))).toEqual({
      findings: [
        {
          check: 'target-size',
          feature: 'trips',
          screen: 'trips',
          frame: 'x',
          nodeId: 'c/1',
          message: '24x24 is under 44x44 on ios',
        },
      ],
    });
  });

  it('exempts a library control at its preset height whatever its label makes its width', () => {
    const wide = testInstance({ bounds: { x: 0, y: 0, width: 132, height: 32 } });
    const shorter = testInstance({ bounds: { x: 0, y: 0, width: 80, height: 28 } });
    expect(targetSize(testInput({ library: testLibrary(), outlines: [frameWith('ios-phone', wide)] }))).toEqual({
      findings: [],
    });
    expect(targetSize(testInput({ library: testLibrary(), outlines: [frameWith('ios-phone', shorter)] }))).toEqual({
      findings: [
        {
          check: 'target-size',
          feature: 'trips',
          screen: 'trips',
          frame: 'x',
          nodeId: '10:1',
          message: '80x28 is under 44x44 on ios',
        },
      ],
    });
  });

  it('reports a nested control overlapping a top-level one', () => {
    const card = testInstance({
      nodeId: 'card',
      interactive: false,
      nested: [nested('card/1', { x: 0, y: 0, width: 48, height: 48 })],
    });
    const fab = testInstance({ nodeId: 'fab', bounds: { x: 40, y: 40, width: 56, height: 56 } });
    expect(overlap(testInput({ outlines: [frameWith('ios-phone', card, fab)] }))).toEqual({
      findings: [
        {
          check: 'overlap',
          feature: 'trips',
          screen: 'trips',
          frame: 'x',
          nodeId: 'card/1',
          message: 'overlaps fab',
        },
      ],
    });
  });
});
