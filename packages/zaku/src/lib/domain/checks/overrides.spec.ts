import { testFrame, testInput, testInstance, testLibrary, testOutline } from '../../../test/fixtures.fixture.js';
import { overrides } from './overrides.js';

const FRAME = 'Trips / Default / Desktop';

function run(instance: ReturnType<typeof testInstance>): ReturnType<typeof overrides> {
  return overrides(
    testInput({
      library: testLibrary(),
      outlines: [testOutline({ frames: [testFrame({ instances: [instance] })] })],
    }),
  );
}

describe('overrides', () => {
  it('passes text, component properties and a size the auto layout sets', () => {
    const outcome = run(
      testInstance({
        overrides: [
          { nodeId: '10:2', fields: ['characters'] },
          { nodeId: '10:1', fields: ['componentProperties', 'width'] },
        ],
      }),
    );
    expect(outcome).toEqual({ findings: [] });
  });

  it('reports a nested icon fill and a fixed height, each by node id and field', () => {
    const outcome = run(
      testInstance({
        overrides: [
          { nodeId: '10:3', fields: ['fills'] },
          { nodeId: '10:1', fields: ['height'] },
        ],
      }),
    );
    expect(outcome).toEqual({
      findings: [
        {
          check: 'overrides',
          feature: 'trips',
          screen: 'trips',
          frame: FRAME,
          nodeId: '10:3',
          field: 'fills',
          message: 'fills overridden inside an instance of Button',
        },
        {
          check: 'overrides',
          feature: 'trips',
          screen: 'trips',
          frame: FRAME,
          nodeId: '10:1',
          field: 'height',
          message: 'height overridden inside an instance of Button',
        },
      ],
    });
  });

  it('reports a nested instance swapped to another component unless a swap property chose it', () => {
    const swapped = testInstance({
      nested: [
        {
          nodeId: '10:3',
          path: 'Icon',
          componentKey: 'icon-heart',
          component: 'heart',
          interactive: false,
          bounds: null,
        },
      ],
    });
    expect(run(swapped)).toEqual({
      findings: [
        {
          check: 'overrides',
          feature: 'trips',
          screen: 'trips',
          frame: FRAME,
          nodeId: '10:3',
          field: 'componentKey',
          message: 'Icon inside an instance of Button was swapped to another component',
        },
      ],
    });
    expect(run({ ...swapped, swaps: ['icon-heart'] })).toEqual({ findings: [] });
  });
});

describe('overrides, on a picture', () => {
  it('passes the image fill set on a layer that holds a picture', () => {
    const avatar = testInstance({
      component: 'Avatar',
      overrides: [{ nodeId: 'I10:1;2', fields: ['fills'] }],
    });
    const frame = testFrame({
      instances: [avatar],
      images: [{ nodeId: 'I10:1;2', name: 'Image', filled: true }],
    });
    expect(overrides(testInput({ library: testLibrary(), outlines: [testOutline({ frames: [frame] })] }))).toEqual({
      findings: [],
    });
  });
});

describe('overrides, on a nested instance set to another variant', () => {
  it('takes a nested instance moved to another variant of the same component as a property change, not a swap', () => {
    const library = testLibrary();
    const button = library.components[0];
    library.components.push({
      ...button!,
      name: 'Spinner',
      key: 'spinner-set',
      variants: [
        { ...button!.variants[0]!, key: 'icon-plus', name: 'Size=sm', props: { Size: 'sm' } },
        { ...button!.variants[0]!, key: 'spinner-lg', name: 'Size=lg', props: { Size: 'lg' } },
      ],
    });
    const instance = testInstance({
      nested: [
        {
          nodeId: '10:3',
          path: 'Icon',
          componentKey: 'spinner-lg',
          component: 'Spinner',
          interactive: false,
          bounds: null,
        },
      ],
    });
    expect(
      overrides(
        testInput({
          library,
          outlines: [testOutline({ frames: [testFrame({ instances: [instance] })] })],
        }),
      ),
    ).toEqual({ findings: [] });
  });
});
