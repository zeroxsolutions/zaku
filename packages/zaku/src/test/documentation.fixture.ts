import type { NodeSnapshot } from '../lib/schema/bridge.js';

type Box = NonNullable<NodeSnapshot['box']>;

/** One layer as a measuring script reads it; children nest. */
export interface Layer {
  name: string;
  type: string;
  box?: Partial<Box>;
  font?: NonNullable<NodeSnapshot['font']>;
  characters?: string;
  properties?: NonNullable<NodeSnapshot['properties']>;
  main?: string;
  children?: Layer[];
}

const BOX: Box = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  sizing: { horizontal: 'FIXED', vertical: 'FIXED' },
  layout: 'NONE',
  wrap: false,
  padding: [0, 0, 0, 0],
  gap: 0,
  crossGap: 0,
  align: ['MIN', 'MIN'],
};

/** The snapshot `zaku check` reads of every layer on a page, the layers given top-level first. */
export function pageSnapshot(page: { id: string; name: string }, layers: readonly Layer[]): NodeSnapshot[] {
  const out: NodeSnapshot[] = [];
  let next = 1;
  const walk = (layer: Layer, parentId: string, frame: string, inSource: boolean): void => {
    const id = `100:${next++}`;
    const source = inSource || layer.type === 'COMPONENT' || layer.type === 'COMPONENT_SET';
    out.push({
      id,
      name: layer.name,
      type: layer.type,
      parentId,
      frame,
      created: false,
      fills: [],
      strokes: [],
      textStyleId: layer.type === 'TEXT' ? null : null,
      ...(layer.characters !== undefined ? { characters: layer.characters } : {}),
      instance:
        layer.type === 'INSTANCE' ? { overrides: [], sizing: { horizontal: 'FIXED', vertical: 'FIXED' } } : null,
      spacing: [],
      page,
      componentSource: source,
      box: { ...BOX, ...layer.box },
      ...(layer.font ? { font: layer.font } : {}),
      ...(layer.properties ? { properties: layer.properties } : {}),
      ...(layer.main !== undefined ? { main: layer.main } : {}),
    });
    for (const child of layer.children ?? []) walk(child, id, frame, source && layer.type !== 'INSTANCE');
  };
  for (const layer of layers) walk(layer, page.id, layer.name, false);
  return out;
}

const text = (
  name: string,
  characters: string,
  size: number,
  lineHeight: number,
  style: string,
  box: Partial<Box> = {},
): Layer => ({
  name,
  type: 'TEXT',
  characters,
  font: { size, lineHeight, style },
  box: { sizing: { horizontal: 'HUG', vertical: 'HUG' }, ...box },
});

const fill = { sizing: { horizontal: 'FILL', vertical: 'HUG' } } as const;

/** Options a drifted drawing changes; every default is the measured library's. */
export interface DocumentationDrift {
  sectionTitle?: [number, number];
  sectionDescription?: [number, number];
  matrixText?: { size: number; lineHeight: number; style: string; sizing: string };
  badges?: Partial<Box>;
  /** A second DS/Section Heading with no properties, as a timed-out run leaves. */
  leftover?: boolean;
  family?: 'Inter' | 'Roboto';
}

/** The documentation components' page, as the team's measured library draws it, or drifted. */
export function documentationComponents(drift: DocumentationDrift = {}): Layer[] {
  const semi = drift.family === 'Roboto' ? 'SemiBold' : 'Semi Bold';
  const extra = drift.family === 'Roboto' ? 'ExtraBold' : 'Extra Bold';
  const [titleSize, titleLine] = drift.sectionTitle ?? [30, 36];
  const [descSize, descLine] = drift.sectionDescription ?? [16, 28];
  const sectionHeading = (properties: boolean): Layer => ({
    name: 'DS/Section Heading',
    type: 'COMPONENT',
    box: {
      x: 0,
      y: 273,
      width: 1200,
      height: titleLine + 9 + 8 + descLine,
      sizing: { horizontal: 'FIXED', vertical: 'HUG' },
      layout: 'VERTICAL',
      gap: 8,
    },
    properties: properties
      ? [
          { name: 'Title', type: 'TEXT', default: 'Section title' },
          { name: 'Description', type: 'TEXT', default: 'Section description.' },
          { name: 'Show description', type: 'BOOLEAN', default: true },
        ]
      : [],
    children: [
      {
        name: 'h2',
        type: 'FRAME',
        box: { width: 1200, height: titleLine + 9, layout: 'VERTICAL', padding: [0, 0, 8, 0], ...fill },
        children: [text('Title', 'Section title', titleSize, titleLine, semi)],
      },
      text('Description', 'Section description.', descSize, descLine, 'Regular', {
        y: titleLine + 17,
        width: 1200,
        ...fill,
      }),
    ],
  });
  const matrix = drift.matrixText ?? { size: 12, lineHeight: 16, style: 'Medium', sizing: 'HUG' };
  return [
    {
      name: 'DS/Header',
      type: 'COMPONENT',
      box: {
        width: 1440,
        height: 193,
        sizing: { horizontal: 'FIXED', vertical: 'HUG' },
        layout: 'HORIZONTAL',
        padding: [48, 40, 40, 40],
        gap: 48,
        align: ['SPACE_BETWEEN', 'MAX'],
      },
      properties: [
        { name: 'Eyebrow', type: 'TEXT', default: 'Components' },
        { name: 'Component name', type: 'TEXT', default: 'Button' },
        { name: 'Show style', type: 'BOOLEAN', default: true },
        { name: 'Definition', type: 'TEXT', default: 'Short description of the component and when to use it.' },
      ],
      children: [
        { name: 'Glow', type: 'FRAME', box: { width: 1440, height: 193 } },
        {
          name: 'Title block',
          type: 'FRAME',
          box: {
            x: 40,
            y: drift.badges ? -32 : 48,
            width: 116,
            height: drift.badges ? 184 : 104,
            sizing: { horizontal: 'HUG', vertical: 'HUG' },
            layout: 'VERTICAL',
            gap: 12,
          },
          children: [
            text('Eyebrow', 'Components', 14, 20, 'Regular'),
            text('Title', 'Button', 36, 40, extra, { y: 32 }),
            {
              name: 'Badges',
              type: 'FRAME',
              box: {
                y: 84,
                width: 71,
                height: 20,
                sizing: { horizontal: 'HUG', vertical: 'HUG' },
                layout: 'HORIZONTAL',
                gap: 8,
                ...drift.badges,
              },
              children: drift.badges ? [] : [{ name: 'Badge \u00b7 secondary', type: 'INSTANCE', main: 'Badge' }],
            },
          ],
        },
        text('Description', 'Short description of the component and when to use it.', 16, 28, 'Regular', {
          x: 920,
          y: 124,
          width: 480,
          sizing: { horizontal: 'FIXED', vertical: 'HUG' },
        }),
      ],
    },
    sectionHeading(true),
    ...(drift.leftover ? [sectionHeading(false)] : []),
    {
      name: 'DS/Table Head',
      type: 'COMPONENT',
      box: { y: 418, width: 200, height: 40, layout: 'VERTICAL', padding: [0, 8, 0, 8], align: ['CENTER', 'MIN'] },
      properties: [{ name: 'Text', type: 'TEXT', default: 'Head' }],
      children: [text('Text', 'Head', 14, 20, 'Medium', { x: 8, y: 10, width: 184, ...fill })],
    },
    {
      name: 'DS/Table Cell',
      type: 'COMPONENT_SET',
      box: {
        y: 522,
        width: 500,
        height: 84,
        sizing: { horizontal: 'FIXED', vertical: 'HUG' },
        layout: 'HORIZONTAL',
        wrap: true,
        padding: [24, 24, 24, 24],
        gap: 24,
        crossGap: 24,
      },
      properties: [
        { name: 'Text', type: 'TEXT', default: 'Cell' },
        { name: 'Emphasis', type: 'VARIANT', default: 'primary' },
      ],
      children: (['primary', 'muted'] as const).map((emphasis, index) => ({
        name: `Emphasis=${emphasis}`,
        type: 'COMPONENT',
        box: {
          x: 24 + index * 224,
          y: 24,
          width: 200,
          height: 36,
          sizing: { horizontal: 'FIXED', vertical: 'HUG' },
          layout: 'VERTICAL',
          padding: [8, 8, 8, 8],
        },
        children: [text('Text', 'Cell', 14, 20, emphasis === 'primary' ? 'Medium' : 'Regular', fill)],
      })),
    },
    {
      name: 'DS/List Item',
      type: 'COMPONENT',
      box: {
        y: 812,
        width: 1176,
        height: 28,
        sizing: { horizontal: 'FIXED', vertical: 'HUG' },
        layout: 'HORIZONTAL',
        gap: 10,
      },
      properties: [{ name: 'Text', type: 'TEXT', default: 'List item text.' }],
      children: [
        text('Bullet', '\u2022', 16, 28, 'Regular', { width: 9, height: 28 }),
        text('Text', 'List item text.', 16, 28, 'Regular', { x: 19, ...fill }),
      ],
    },
    {
      name: 'DS/Matrix Head',
      type: 'COMPONENT',
      box: { y: 988, width: 120, height: 40, layout: 'VERTICAL', padding: [0, 8, 0, 8], align: ['CENTER', 'CENTER'] },
      properties: [{ name: 'Text', type: 'TEXT', default: 'Prop=value' }],
      children: [
        text('Text', 'Prop=value', matrix.size, matrix.lineHeight, matrix.style, {
          x: 28,
          y: 12,
          width: 65,
          height: 16,
          sizing: { horizontal: matrix.sizing, vertical: 'HUG' },
        }),
      ],
    },
  ];
}

const frame = (name: string, box: Partial<Box>, children: Layer[] = []): Layer => ({
  name,
  type: 'FRAME',
  box,
  children,
});
const instance = (name: string, main: string, box: Partial<Box>): Layer => ({ name, type: 'INSTANCE', main, box });
const vertical = (padding: Box['padding'], gap: number): Partial<Box> => ({ layout: 'VERTICAL', padding, gap });
const horizontal = (padding: Box['padding'], gap: number): Partial<Box> => ({ layout: 'HORIZONTAL', padding, gap });
const none: Box['padding'] = [0, 0, 0, 0];
const section = (name: string, content: Layer[]): Layer =>
  frame(name, { width: 1200, ...vertical(none, 24) }, [
    instance('Heading', 'DS/Section Heading', { width: 1200, height: 81 }),
    ...content,
  ]);
const view = (name: string, sections: Layer[]): Layer =>
  frame(name, { width: 1440, ...vertical(none, 0) }, [
    instance('DS/Header', 'DS/Header', { width: 1440, height: 193 }),
    frame('Body', { width: 1440, ...vertical([48, 120, 96, 120], 64) }, sections),
  ]);
const demo = (name: string): Layer =>
  section(name, [
    frame('Preview', { width: 1200, ...horizontal([40, 40, 40, 40], 24), align: ['CENTER', 'CENTER'] }, [
      frame(name, {
        x: 350,
        width: 500,
        sizing: { horizontal: 'HUG', vertical: 'HUG' },
        layout: 'HORIZONTAL',
        gap: 12,
        crossGap: 12,
        wrap: true,
        align: ['MIN', 'CENTER'],
      }),
    ]),
  ]);
const cards = (count: number): Layer =>
  frame(
    'Cards',
    { width: 1200, layout: 'GRID', gap: 16, crossGap: 16 },
    Array.from({ length: count }, () => instance('Card', 'Card', { width: 592 })),
  );

/** A component's two views, as the measured library draws Button's. */
export function buttonViews(): Layer[] {
  return [
    view('Nova / Button', [
      section('Component', [
        frame('Preview', { width: 1200, ...horizontal(none, 24) }, [frame('Matrix', { width: 1200 })]),
      ]),
    ]),
    view('Nova / Button / Guidance', [
      section('Anatomy', [
        frame('Anatomy layout', { width: 1200, ...horizontal(none, 16) }, [
          frame('Preview', {
            width: 744,
            height: 474,
            sizing: { horizontal: 'FILL', vertical: 'FILL' },
            ...horizontal([24, 24, 24, 24], 24),
            align: ['CENTER', 'CENTER'],
          }),
          frame('Cards', {
            x: 760,
            width: 440,
            height: 474,
            sizing: { horizontal: 'FIXED', vertical: 'HUG' },
            layout: 'GRID',
            gap: 16,
            crossGap: 16,
          }),
        ]),
      ]),
      demo('Variants'),
      demo('Sizes'),
      demo('Composition'),
      section('Properties', [
        frame('Table', { width: 1200, ...vertical(none, 0) }, [
          frame('TableHeader', { width: 1198, height: 40, ...horizontal(none, 0) }),
          frame('TableRow', { width: 1198, height: 37, ...horizontal(none, 0) }),
        ]),
      ]),
      section('Usage', [
        frame('List', { width: 1200, ...vertical([0, 0, 0, 24], 8) }, [
          instance('li', 'DS/List Item', { width: 1176, height: 28 }),
        ]),
      ]),
      section('Behavior & content', [cards(4)]),
      section('Accessibility', [cards(4)]),
      section('Preview', [
        frame('Theme Preview', { width: 1200, ...horizontal(none, 16) }, [
          frame('Preview', vertical([40, 40, 40, 40], 20)),
        ]),
      ]),
    ]),
  ];
}

/**
 * The library's cover as the measured library draws it: the Thumbnail frame, its Glow running past the edges, and
 * a composition whose second column runs past the right edge. `cardHeight` is the height of that column's Card,
 * at y 320 in the composition.
 */
export function cover(cardHeight = 240): Layer[] {
  return [
    frame('Thumbnail', { width: 1200, height: 675 }, [
      frame('Glow', { width: 1200, height: 675 }, [
        frame('Glow \u00b7 primary', { x: 820, y: -170, width: 900, height: 420 }),
      ]),
      frame('Intro', { x: 72, y: 72, width: 464, height: 531, ...vertical(none, 24) }),
      frame('Composition', { x: 616, y: 72, width: 648, height: 531 }, [
        instance('Card', 'Card', { x: 0, y: 0, width: 336, height: 283 }),
        instance('Card', 'Card', { x: 368, y: 320, width: 280, height: cardHeight }),
      ]),
    ]),
  ];
}
