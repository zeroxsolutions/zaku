/**
 * The names Figma gives a new node, by the node's type, each optionally followed by the number the editor adds
 * (`Frame 12`). A name is a default only on the type Figma gives it to: a FRAME named `Component` was named by
 * someone. A TEXT is named for its characters and an INSTANCE for its component, so neither has one.
 */
const DEFAULT_NAMES: Readonly<Record<string, readonly string[]>> = {
  FRAME: ['Frame'],
  GROUP: ['Group'],
  SECTION: ['Section'],
  COMPONENT: ['Component'],
  COMPONENT_SET: ['Component'],
  RECTANGLE: ['Rectangle'],
  ELLIPSE: ['Ellipse'],
  LINE: ['Line'],
  POLYGON: ['Polygon'],
  STAR: ['Star'],
  VECTOR: ['Vector'],
  SLICE: ['Slice'],
  BOOLEAN_OPERATION: ['Union', 'Subtract', 'Intersect', 'Exclude'],
};

/** Whether `name` is the name Figma gave a new node of `type`, which says nothing about what it holds. */
export function isDefaultLayerName(type: string, name: string): boolean {
  const match = /^(.+?)(?: \d+)?$/.exec(name);
  return match !== null && (DEFAULT_NAMES[type] ?? []).includes(match[1] ?? '');
}
