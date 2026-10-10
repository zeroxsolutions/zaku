/**
 * The documentation's measures: zaku's frame around every library, the same whatever the design system. The
 * `documentation` rule holds a library's documentation to this table, and building-the-library's Figma reference
 * prints it, so the two read one source. Colours stay role-bound and are written here for the reader only.
 */

/** How a node sizes on one axis, as Figma's `layoutSizingHorizontal` and `layoutSizingVertical` name it. */
export type DocumentationSizing = 'FIXED' | 'HUG' | 'FILL';

export interface DocumentationLayout {
  mode: 'HORIZONTAL' | 'VERTICAL' | 'GRID';
  /** Top, right, bottom, left. */
  padding: readonly [number, number, number, number];
  /** Along the axis; a grid's column gap. */
  gap: number;
  /** Across it: a wrapping row's row gap, a grid's row gap. */
  crossGap?: number;
  wrap?: boolean;
  /** `primaryAxisAlignItems`, then `counterAxisAlignItems`. */
  align?: readonly [string, string];
}

export interface DocumentationProperty {
  name: string;
  type: 'TEXT' | 'BOOLEAN' | 'VARIANT' | 'INSTANCE_SWAP';
  default: string | boolean;
}

export interface DocumentationPart {
  /**
   * Names from the part's root down. On the documentation components' page the root is the component; in a view,
   * the view's frame. `*` stands for any one name.
   */
  path: readonly string[];
  where: 'components' | 'view';
  type: 'COMPONENT' | 'COMPONENT_SET' | 'FRAME' | 'INSTANCE' | 'TEXT';
  /** An instance's component. Under a path ending in `*`, it picks the part out rather than being checked. */
  main?: string;
  /** Its place in its parent. */
  at?: { x: number; y: number };
  width?: number;
  height?: number;
  sizing?: { horizontal?: DocumentationSizing; vertical?: DocumentationSizing };
  /** The auto layout; more than one where the documentation offers a choice. */
  layout?: DocumentationLayout | readonly DocumentationLayout[];
  /** A text's size and line height in px, and its weight, whatever the family spells it. */
  font?: { size: number; lineHeight: number; weight: 'Regular' | 'Medium' | 'SemiBold' | 'Bold' | 'ExtraBold' };
  /** What a text shows in the component: the default of the property bound to it. */
  text?: string;
  properties?: readonly DocumentationProperty[];
  /** The colour roles, for the reader; the rule does not read them. */
  paint?: string;
}

/**
 * The library's cover: its page, its one frame and that frame's size; the layer that runs past every edge; the frame
 * holding the brand mark; the
 * share of a block's width that has to run past the right edge for it to bleed rather than be cut; and the margin
 * a block that does not bleed keeps from the right edge, as the intro keeps from the left.
 */
export const COVER = {
  page: 'Thumbnail',
  frame: 'Thumbnail',
  width: 1200,
  height: 675,
  bleeds: 'Glow',
  /** The frame the brand mark is placed in, which keeps the brand's own colours. */
  logo: 'Logo',
  bleed: 0.25,
  margin: 72,
} as const;

/** The name the views' and the components' page carries. */
export const DOCUMENTATION_COMPONENTS_PAGE = 'Component for Docs';

const vertical = (padding: DocumentationLayout['padding'], gap: number, align?: DocumentationLayout['align']) =>
  ({ mode: 'VERTICAL', padding, gap, ...(align ? { align } : {}) }) as const;
const horizontal = (padding: DocumentationLayout['padding'], gap: number, align?: DocumentationLayout['align']) =>
  ({ mode: 'HORIZONTAL', padding, gap, ...(align ? { align } : {}) }) as const;
const none = [0, 0, 0, 0] as const;

export const DOCUMENTATION_PARTS: readonly DocumentationPart[] = [
  {
    path: ['DS/Header'],
    where: 'components',
    type: 'COMPONENT',
    at: { x: 0, y: 0 },
    width: 1440,
    sizing: { horizontal: 'FIXED', vertical: 'HUG' },
    layout: horizontal([48, 40, 40, 40], 48, ['SPACE_BETWEEN', 'MAX']),
    properties: [
      { name: 'Eyebrow', type: 'TEXT', default: 'Components' },
      { name: 'Component name', type: 'TEXT', default: 'Button' },
      { name: 'Show style', type: 'BOOLEAN', default: true },
      { name: 'Definition', type: 'TEXT', default: 'Short description of the component and when to use it.' },
    ],
    paint: 'fill color/background; bottom stroke 1 color/border',
  },
  {
    path: ['DS/Header', 'Glow'],
    where: 'components',
    type: 'FRAME',
    at: { x: 0, y: 0 },
    width: 1440,
    height: 193,
    paint: 'no fill; absolute, not clipping; two radial ellipses, named and placed under the table',
  },
  {
    path: ['DS/Header', 'Title block'],
    where: 'components',
    type: 'FRAME',
    sizing: { horizontal: 'HUG', vertical: 'HUG' },
    layout: vertical(none, 12),
  },
  {
    path: ['DS/Header', 'Title block', 'Eyebrow'],
    where: 'components',
    type: 'TEXT',
    font: { size: 14, lineHeight: 20, weight: 'Regular' },
    text: 'Components',
    paint: 'color/muted-foreground',
  },
  {
    path: ['DS/Header', 'Title block', 'Title'],
    where: 'components',
    type: 'TEXT',
    font: { size: 36, lineHeight: 40, weight: 'ExtraBold' },
    text: 'Button',
    paint: 'color/foreground; tracking -2.5%',
  },
  {
    path: ['DS/Header', 'Title block', 'Badges'],
    where: 'components',
    type: 'FRAME',
    sizing: { horizontal: 'HUG', vertical: 'HUG' },
    layout: horizontal(none, 8),
    paint: "no fill; holds one instance of the library's Badge, secondary, once it exists",
  },
  {
    path: ['DS/Header', 'Description'],
    where: 'components',
    type: 'TEXT',
    width: 480,
    font: { size: 16, lineHeight: 28, weight: 'Regular' },
    text: 'Short description of the component and when to use it.',
    paint: 'color/muted-foreground',
  },
  {
    path: ['DS/Section Heading'],
    where: 'components',
    type: 'COMPONENT',
    at: { x: 0, y: 273 },
    width: 1200,
    height: 81,
    sizing: { horizontal: 'FIXED', vertical: 'HUG' },
    layout: vertical(none, 8),
    properties: [
      { name: 'Title', type: 'TEXT', default: 'Section title' },
      { name: 'Description', type: 'TEXT', default: 'Section description.' },
      { name: 'Show description', type: 'BOOLEAN', default: true },
    ],
    paint: 'no fill',
  },
  {
    path: ['DS/Section Heading', 'h2'],
    where: 'components',
    type: 'FRAME',
    width: 1200,
    height: 45,
    sizing: { horizontal: 'FILL', vertical: 'HUG' },
    layout: vertical([0, 0, 8, 0], 0),
    paint: 'bottom stroke 1 color/border, counted in the layout',
  },
  {
    path: ['DS/Section Heading', 'h2', 'Title'],
    where: 'components',
    type: 'TEXT',
    font: { size: 30, lineHeight: 36, weight: 'SemiBold' },
    text: 'Section title',
    paint: 'color/foreground; tracking -2.5%',
  },
  {
    path: ['DS/Section Heading', 'Description'],
    where: 'components',
    type: 'TEXT',
    width: 1200,
    sizing: { horizontal: 'FILL' },
    font: { size: 16, lineHeight: 28, weight: 'Regular' },
    text: 'Section description.',
    paint: 'color/muted-foreground; visible bound to Show description',
  },
  {
    path: ['DS/Table Head'],
    where: 'components',
    type: 'COMPONENT',
    at: { x: 0, y: 418 },
    width: 200,
    height: 40,
    sizing: { horizontal: 'FIXED', vertical: 'FIXED' },
    layout: vertical([0, 8, 0, 8], 0, ['CENTER', 'MIN']),
    properties: [{ name: 'Text', type: 'TEXT', default: 'Head' }],
    paint: 'no fill',
  },
  {
    path: ['DS/Table Head', 'Text'],
    where: 'components',
    type: 'TEXT',
    sizing: { horizontal: 'FILL' },
    font: { size: 14, lineHeight: 20, weight: 'Medium' },
    text: 'Head',
    paint: 'color/foreground',
  },
  {
    path: ['DS/Table Cell'],
    where: 'components',
    type: 'COMPONENT_SET',
    at: { x: 0, y: 522 },
    width: 500,
    height: 84,
    sizing: { horizontal: 'FIXED', vertical: 'HUG' },
    layout: { mode: 'HORIZONTAL', padding: [24, 24, 24, 24], gap: 24, crossGap: 24, wrap: true },
    properties: [
      { name: 'Text', type: 'TEXT', default: 'Cell' },
      { name: 'Emphasis', type: 'VARIANT', default: 'primary' },
    ],
    paint: 'radius 5; the dashed border Figma gives a set',
  },
  ...(['primary', 'muted'] as const).flatMap((emphasis, index): DocumentationPart[] => [
    {
      path: ['DS/Table Cell', `Emphasis=${emphasis}`],
      where: 'components',
      type: 'COMPONENT',
      at: { x: 24 + index * 224, y: 24 },
      width: 200,
      height: 36,
      sizing: { horizontal: 'FIXED', vertical: 'HUG' },
      layout: vertical([8, 8, 8, 8], 0),
      paint: 'no fill',
    },
    {
      path: ['DS/Table Cell', `Emphasis=${emphasis}`, 'Text'],
      where: 'components',
      type: 'TEXT',
      sizing: { horizontal: 'FILL' },
      font: { size: 14, lineHeight: 20, weight: emphasis === 'primary' ? 'Medium' : 'Regular' },
      text: 'Cell',
      paint: emphasis === 'primary' ? 'color/foreground' : 'color/muted-foreground',
    },
  ]),
  {
    path: ['DS/List Item'],
    where: 'components',
    type: 'COMPONENT',
    at: { x: 0, y: 812 },
    width: 1176,
    height: 28,
    sizing: { horizontal: 'FIXED', vertical: 'HUG' },
    layout: horizontal(none, 10),
    properties: [{ name: 'Text', type: 'TEXT', default: 'List item text.' }],
    paint: 'no fill',
  },
  {
    path: ['DS/List Item', 'Bullet'],
    where: 'components',
    type: 'TEXT',
    sizing: { horizontal: 'HUG' },
    font: { size: 16, lineHeight: 28, weight: 'Regular' },
    // U+2022, the list's own marker, as the code's list-disc draws it.
    text: '\u2022',
    paint: 'color/foreground',
  },
  {
    path: ['DS/List Item', 'Text'],
    where: 'components',
    type: 'TEXT',
    sizing: { horizontal: 'FILL' },
    font: { size: 16, lineHeight: 28, weight: 'Regular' },
    text: 'List item text.',
    paint: 'color/foreground',
  },
  {
    path: ['DS/Matrix Head'],
    where: 'components',
    type: 'COMPONENT',
    at: { x: 0, y: 988 },
    width: 120,
    height: 40,
    sizing: { horizontal: 'FIXED', vertical: 'FIXED' },
    layout: vertical([0, 8, 0, 8], 0, ['CENTER', 'CENTER']),
    properties: [{ name: 'Text', type: 'TEXT', default: 'Prop=value' }],
    paint: 'no fill',
  },
  {
    path: ['DS/Matrix Head', 'Text'],
    where: 'components',
    type: 'TEXT',
    sizing: { horizontal: 'HUG' },
    font: { size: 12, lineHeight: 16, weight: 'Medium' },
    text: 'Prop=value',
    paint: 'color/muted-foreground',
  },
  { path: ['*'], where: 'view', type: 'FRAME', width: 1440, layout: vertical(none, 0), paint: 'fill color/background' },
  { path: ['*', '*'], where: 'view', type: 'INSTANCE', main: 'DS/Header', width: 1440 },
  {
    path: ['*', 'Body'],
    where: 'view',
    type: 'FRAME',
    width: 1440,
    layout: vertical([48, 120, 96, 120], 64),
    paint: 'no fill',
  },
  { path: ['*', 'Body', '*'], where: 'view', type: 'FRAME', width: 1200, layout: vertical(none, 24), paint: 'no fill' },
  { path: ['*', 'Body', '*', 'Heading'], where: 'view', type: 'INSTANCE', main: 'DS/Section Heading', width: 1200 },
  {
    path: ['*', 'Body', 'Component', 'Preview'],
    where: 'view',
    type: 'FRAME',
    width: 1200,
    layout: [horizontal(none, 24), vertical(none, 40)],
    paint: 'fill color/background, radius 14, no stroke; vertical for a set of text styles',
  },
  {
    path: ['*', 'Body', 'Matrix', 'Matrix'],
    where: 'view',
    type: 'FRAME',
    width: 1200,
    layout: vertical(none, 0),
    paint: 'stroke 1 color/border, radius 8',
  },
  {
    path: ['*', 'Body', 'Matrix', 'Matrix', 'TableHeader'],
    where: 'view',
    type: 'FRAME',
    height: 40,
    layout: horizontal(none, 0),
  },
  {
    path: ['*', 'Body', 'Example', 'Preview'],
    where: 'view',
    type: 'FRAME',
    width: 1200,
    layout: { mode: 'HORIZONTAL', padding: [40, 40, 40, 40], gap: 48, crossGap: 24, wrap: true },
    paint: 'fill color/background, stroke 1 color/border, radius 14',
  },
  ...(['Variants', 'Sizes', 'Composition'] as const).flatMap((section): DocumentationPart[] => [
    {
      path: ['*', 'Body', section, 'Preview'],
      where: 'view',
      type: 'FRAME',
      width: 1200,
      layout: horizontal([40, 40, 40, 40], 24, ['CENTER', 'CENTER']),
      paint: 'fill color/background, stroke 1 color/border, radius 14',
    },
    {
      path: ['*', 'Body', section, 'Preview', section],
      where: 'view',
      type: 'FRAME',
      sizing: { horizontal: 'HUG', vertical: 'HUG' },
      layout: { mode: 'HORIZONTAL', padding: none, gap: 12, crossGap: 12, wrap: true, align: ['MIN', 'CENTER'] },
      paint: 'centred in the preview, hugging its row of instances',
    },
  ]),
  {
    path: ['*', 'Body', 'Anatomy', 'Anatomy layout'],
    where: 'view',
    type: 'FRAME',
    width: 1200,
    layout: horizontal(none, 16),
  },
  {
    path: ['*', 'Body', 'Anatomy', 'Anatomy layout', 'Preview'],
    where: 'view',
    type: 'FRAME',
    width: 744,
    sizing: { horizontal: 'FILL', vertical: 'FILL' },
    layout: horizontal([24, 24, 24, 24], 24, ['CENTER', 'CENTER']),
    paint: 'fill color/background, stroke 1 color/border, radius 14',
  },
  {
    path: ['*', 'Body', 'Anatomy', 'Anatomy layout', 'Cards'],
    where: 'view',
    type: 'FRAME',
    width: 440,
    sizing: { horizontal: 'FIXED', vertical: 'HUG' },
    layout: { mode: 'GRID', padding: none, gap: 16, crossGap: 16 },
    paint: 'one column, one Card per part',
  },
  {
    path: ['*', 'Body', '*', 'Table'],
    where: 'view',
    type: 'FRAME',
    width: 1200,
    layout: vertical(none, 0),
    paint: 'stroke 1 color/border, radius 8',
  },
  {
    path: ['*', 'Body', '*', 'Table', 'TableHeader'],
    where: 'view',
    type: 'FRAME',
    height: 40,
    layout: horizontal(none, 0),
    paint: 'bottom stroke 1 color/border',
  },
  {
    path: ['*', 'Body', '*', 'Table', 'TableRow'],
    where: 'view',
    type: 'FRAME',
    layout: horizontal(none, 0),
    paint: 'bottom stroke 1 color/border, none on the last',
  },
  { path: ['*', 'Body', '*', 'List'], where: 'view', type: 'FRAME', width: 1200, layout: vertical([0, 0, 0, 24], 8) },
  { path: ['*', 'Body', '*', 'List', 'li'], where: 'view', type: 'INSTANCE', main: 'DS/List Item', width: 1176 },
  {
    path: ['*', 'Body', '*', 'Cards'],
    where: 'view',
    type: 'FRAME',
    width: 1200,
    layout: { mode: 'GRID', padding: none, gap: 16, crossGap: 16 },
  },
  {
    path: ['*', 'Body', '*', 'Cards', 'Card'],
    where: 'view',
    type: 'INSTANCE',
    width: 592,
    paint: "the library's Card",
  },
  {
    path: ['*', 'Body', 'Preview', 'Theme Preview'],
    where: 'view',
    type: 'FRAME',
    width: 1200,
    layout: horizontal(none, 16),
  },
  {
    path: ['*', 'Body', 'Preview', 'Theme Preview', 'Preview'],
    where: 'view',
    type: 'FRAME',
    layout: vertical([40, 40, 40, 40], 20),
    paint: 'fill color/background, stroke 1 color/border, radius 14; no mode of its own',
  },
];
