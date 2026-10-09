import { outlineFrame, type OutlineContext } from './figma-rest-outline.js';
import type { RestNode } from './figma-rest-types.js';

const box = (x: number, y: number, width: number, height: number): RestNode['absoluteBoundingBox'] => ({
  x,
  y,
  width,
  height,
});

const frame: RestNode = {
  id: '1:1',
  name: 'Trips / Default / Desktop',
  type: 'FRAME',
  absoluteBoundingBox: box(1000, 2000, 1440, 900),
  fills: [{ type: 'SOLID' }],
  children: [
    {
      id: '2:1',
      name: 'Header',
      type: 'FRAME',
      fills: [],
      children: [
        {
          id: '2:2',
          name: 'Title',
          type: 'TEXT',
          characters: 'Your trips',
          styles: { text: 'S:1' },
        },
      ],
    },
    {
      id: '3:1',
      name: 'Button',
      type: 'INSTANCE',
      componentId: 'C:btn',
      absoluteBoundingBox: box(1010, 2100, 80, 32),
      layoutSizingHorizontal: 'HUG',
      layoutSizingVertical: 'FIXED',
      componentProperties: {
        Variant: { type: 'VARIANT', value: 'default' },
        'Icon#12:0': { type: 'INSTANCE_SWAP', value: 'C:heart' },
      },
      overrides: [{ id: 'I3:1;5:1', overriddenFields: ['fills'] }],
      interactions: [
        {
          trigger: { type: 'ON_CLICK' },
          actions: [{ type: 'NODE', destinationId: '9:9', navigation: 'NAVIGATE' }],
        },
      ],
      children: [
        { id: 'I3:1;5:1', name: 'Icon', type: 'INSTANCE', componentId: 'C:heart', children: [] },
        { id: 'I3:1;5:2', name: 'Label', type: 'TEXT', characters: 'Save trip' },
        { id: 'I3:1;5:3', name: 'Hint', type: 'TEXT', characters: 'Lorem ipsum', visible: false },
      ],
    },
    { id: '4:1', name: 'Rectangle 4', type: 'RECTANGLE' },
    { id: '4:2', name: 'Note', type: 'TEXT', characters: 'Plan one' },
    {
      id: '4:3',
      name: 'Card',
      type: 'FRAME',
      fills: [{ type: 'SOLID' }],
      interactions: [{ trigger: { type: 'ON_CLICK' }, actions: [{ type: 'BACK' }] }],
      children: [{ id: '4:5', name: 'Body', type: 'TEXT', characters: 'Hoi An', styles: { text: 'S:1' } }],
    },
    { id: '4:4', name: 'Hidden', type: 'RECTANGLE', visible: false },
    { id: '4:6', name: 'Hero photo', type: 'RECTANGLE', fills: [{ type: 'IMAGE' }] },
    { id: '4:7', name: 'Cover photo', type: 'FRAME', fills: [], children: [] },
  ],
};

const ctx: OutlineContext = {
  components: {
    'C:btn': { key: 'k-btn', name: 'Variant=default', componentSetId: 'CS:btn' },
    'C:heart': { key: 'k-heart', name: 'heart' },
  },
  componentSets: { 'CS:btn': { key: 'ks-btn', name: 'Button' } },
  styles: { 'S:1': { key: 'k-style', name: 'typography/h2', styleType: 'TEXT' } },
  interactive: new Set(['Button']),
};

describe('outlineFrame', () => {
  const outline = outlineFrame(
    frame,
    { target: 'web-desktop', state: 'Default', containers: ['Trips', 'Default'], start: true },
    ctx,
  );

  it('names the frame, its size, where it sits and whether a flow starts on it', () => {
    expect({
      name: outline.name,
      size: outline.size,
      containers: outline.containers,
      start: outline.start,
    }).toEqual({
      name: 'Trips / Default / Desktop',
      size: { width: 1440, height: 900 },
      containers: ['Trips', 'Default'],
      start: true,
    });
  });

  it('keeps an instance with its set name, variant, swaps, overrides, nested items, texts and relative bounds', () => {
    expect(outline.instances).toEqual([
      {
        nodeId: '3:1',
        component: 'Button',
        componentKey: 'k-btn',
        variant: 'Variant=default',
        properties: { Variant: 'default', Icon: 'C:heart' },
        swaps: ['k-heart'],
        overrides: [{ nodeId: 'I3:1;5:1', fields: ['fills'] }],
        nested: [
          {
            nodeId: 'I3:1;5:1',
            path: 'Icon',
            componentKey: 'k-heart',
            component: 'heart',
            interactive: false,
            bounds: null,
          },
        ],
        texts: [{ nodeId: 'I3:1;5:2', path: 'Label', characters: 'Save trip' }],
        interactive: true,
        local: false,
        bounds: { x: 10, y: 100, width: 80, height: 32 },
        sizing: { horizontal: 'HUG', vertical: 'FIXED' },
      },
    ]);
  });

  it('keeps text outside instances with its style key, and skips hidden layers', () => {
    expect(outline.texts).toEqual([
      { nodeId: '2:2', characters: 'Your trips', styleKey: 'k-style' },
      { nodeId: '4:2', characters: 'Plan one', styleKey: null },
      { nodeId: '4:5', characters: 'Hoi An', styleKey: 'k-style' },
    ]);
  });

  it('lists a shape, an unstyled text and a container with its own fill as raw, with the shape of its subtree', () => {
    expect(outline.raw).toEqual([
      {
        nodeId: '4:1',
        name: 'Rectangle 4',
        type: 'RECTANGLE',
        reason: 'a shape outside the library',
        signature: 'RECTANGLE',
      },
      {
        nodeId: '4:2',
        name: 'Note',
        type: 'TEXT',
        reason: 'a text with no library text style',
        signature: 'TEXT',
      },
      {
        nodeId: '4:3',
        name: 'Card',
        type: 'FRAME',
        reason: 'a container with its own fill, stroke or effect',
        signature: 'FRAME(TEXT)',
      },
      {
        nodeId: '4:6',
        name: 'Hero photo',
        type: 'RECTANGLE',
        reason: 'a shape outside the library',
        signature: 'RECTANGLE',
      },
    ]);
  });

  it('lists each layer named for a picture or holding one, and whether it holds the image', () => {
    expect(outline.images).toEqual([
      { nodeId: '4:6', name: 'Hero photo', filled: true },
      { nodeId: '4:7', name: 'Cover photo', filled: false },
    ]);
  });

  it('lists layers left with a default name, outside instances', () => {
    expect(outline.defaultNames).toEqual([{ nodeId: '4:1', name: 'Rectangle 4' }]);
  });

  it("lists a name only where it is the default Figma gives that node's type", () => {
    const view: RestNode = {
      id: '7:1',
      name: 'Nova / Card',
      type: 'FRAME',
      fills: [],
      children: [
        { id: '7:2', name: 'Component', type: 'FRAME', fills: [], children: [] },
        { id: '7:3', name: 'Frame 2', type: 'FRAME', fills: [], children: [] },
        { id: '7:4', name: 'Rectangle', type: 'TEXT', characters: 'Rectangle', styles: { text: 'S:1' } },
      ],
    };
    const place = { target: 'web-desktop', state: 'Default', containers: [], start: false };
    expect(outlineFrame(view, place, ctx).defaultNames).toEqual([{ nodeId: '7:3', name: 'Frame 2' }]);
  });

  it('lists each prototype connection, a Back action included', () => {
    expect(outline.links).toEqual([
      { nodeId: '3:1', to: { nodeId: '9:9' } },
      { nodeId: '4:3', to: 'back' },
    ]);
  });
});

describe('outlineFrame, inside a component the product owns', () => {
  const card: RestNode = {
    id: '1:2',
    name: 'Trips / Default / Mobile',
    type: 'FRAME',
    absoluteBoundingBox: box(0, 0, 390, 844),
    children: [
      {
        id: '5:1',
        name: 'Trip card',
        type: 'INSTANCE',
        componentId: 'C:card',
        absoluteBoundingBox: box(16, 100, 358, 200),
        children: [
          { id: 'I5:1;1', name: 'Cover', type: 'RECTANGLE', fills: [{ type: 'IMAGE' }] },
          { id: 'I5:1;2', name: 'Cover', type: 'TEXT', characters: 'Hoi An' },
          {
            id: 'I5:1;3',
            name: 'Back',
            type: 'INSTANCE',
            componentId: 'C:btn',
            absoluteBoundingBox: box(24, 108, 24, 24),
            interactions: [{ trigger: { type: 'ON_CLICK' }, actions: [{ type: 'BACK' }] }],
          },
        ],
      },
      { id: '5:2', name: 'Avatar photo', type: 'INSTANCE', componentId: 'C:heart', children: [] },
    ],
  };
  const owned: OutlineContext = {
    ...ctx,
    components: {
      ...ctx.components,
      'C:card': { key: 'k-card', name: 'Trip card', remote: false },
      'C:btn': { ...ctx.components['C:btn'], remote: true },
    },
  };
  const outline = outlineFrame(card, { target: 'ios-phone', state: 'Default', containers: [], start: false }, owned);

  it('marks a component the file owns as local, and one the library publishes as not', () => {
    expect(outline.instances.map((instance) => [instance.component, instance.local])).toEqual([
      ['Trip card', true],
      ['heart', false],
    ]);
  });

  it('keeps a nested instance with its component, whether it is a control, and its bounds in the frame', () => {
    expect(outline.instances[0]?.nested).toEqual([
      {
        nodeId: 'I5:1;3',
        path: 'Back',
        componentKey: 'k-btn',
        component: 'Button',
        interactive: true,
        bounds: { x: 24, y: 108, width: 24, height: 24 },
      },
    ]);
  });

  it('keeps a link a nested layer carries', () => {
    expect(outline.links).toEqual([{ nodeId: 'I5:1;3', to: 'back' }]);
  });

  it('lists a picture inside an instance, never the instance itself or a text', () => {
    expect(outline.images).toEqual([{ nodeId: 'I5:1;1', name: 'Cover', filled: true }]);
  });
});
