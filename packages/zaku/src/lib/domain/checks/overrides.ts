import type { Check, Finding } from '../findings.js';

/** Override fields a product frame may change: its copy, its component properties, its layer names. */
export const ALLOWED_OVERRIDES = new Set([
  'characters',
  'name',
  'componentProperties',
  'componentPropertyReferences',
  'exposedInstances',
]);

/**
 * What Figma records on an instance itself when it is set to fill or hug: the auto layout sizing mode that follows.
 * The instance's own width and height rule decides whether that stretch is allowed.
 */
export const SIZING_MODES = new Set(['primaryAxisSizingMode', 'counterAxisSizingMode']);

/** Whether an instance is its component's size on the axis a `width` or `height` override names. */
export function componentSized(
  field: string,
  size: { width: number; height: number } | null | undefined,
  main: { width: number; height: number } | undefined,
): boolean {
  if (!size || !main || (field !== 'width' && field !== 'height')) return false;
  return Math.abs(size[field] - main[field]) < 0.5;
}

/** Whether an instance sizes itself on either axis by filling or hugging, rather than at a fixed size. */
export function stretches(sizing: { horizontal: string; vertical: string }): boolean {
  return sizing.horizontal !== 'FIXED' || sizing.vertical !== 'FIXED';
}

/** Whether a layer sits inside a nested instance that one of the instance's swap properties chose. */
function insideSwap(
  instance: { swaps: readonly string[]; nested: readonly { nodeId: string; componentKey: string }[] },
  nodeId: string,
): boolean {
  return instance.nested.some(
    (nested) => nodeId.startsWith(`${nested.nodeId};`) && instance.swaps.includes(nested.componentKey),
  );
}

export const overrides: Check = ({ outlines, library }) => {
  if (!library) return { notRun: 'library.json is missing' };
  const nestedOf = new Map<string, Map<string, string | null>>();
  /** The component each published variant belongs to, so a nested instance set to a sibling variant is not a swap. */
  const componentOf = new Map<string, string>();
  for (const component of library.components) {
    for (const variant of component.variants) {
      componentOf.set(variant.key, component.name);
      nestedOf.set(variant.key, new Map((variant.modes[0]?.items ?? []).map((item) => [item.path, item.componentKey])));
    }
  }
  const findings: Finding[] = [];
  for (const outline of outlines) {
    for (const frame of outline.frames) {
      const where = { feature: outline.feature, screen: outline.screen, frame: frame.name };
      // A picture is placed as an image fill, so the fill on a layer that holds one is content, not restyling.
      const pictures = new Set(frame.images.filter((image) => image.filled).map((image) => image.nodeId));
      for (const instance of frame.instances) {
        for (const override of instance.overrides) {
          for (const field of override.fields) {
            if (ALLOWED_OVERRIDES.has(field)) continue;
            if (field === 'fills' && pictures.has(override.nodeId)) continue;
            const self = override.nodeId === instance.nodeId;
            if (self && field === 'width' && instance.sizing.horizontal !== 'FIXED') continue;
            if (self && field === 'height' && instance.sizing.vertical !== 'FIXED') continue;
            if (self && SIZING_MODES.has(field) && stretches(instance.sizing)) continue;
            if (self && componentSized(field, instance.bounds, instance.main)) continue;
            // An icon swap drops the colour the component gives its glyph, and REST cannot read that colour to
            // compare, so a paint on a glyph inside an icon a swap property chose is taken as painting it back.
            if (!self && (field === 'fills' || field === 'strokes') && insideSwap(instance, override.nodeId)) continue;
            findings.push({
              check: 'overrides',
              ...where,
              nodeId: override.nodeId,
              field,
              message: `${field} overridden inside an instance of ${instance.component}`,
            });
          }
        }
        const expected = nestedOf.get(instance.componentKey);
        for (const nested of instance.nested) {
          const key = expected?.get(nested.path);
          const sameComponent = key
            ? componentOf.get(key) !== undefined && componentOf.get(key) === componentOf.get(nested.componentKey)
            : false;
          if (
            key !== undefined &&
            key !== nested.componentKey &&
            !sameComponent &&
            !instance.swaps.includes(nested.componentKey)
          ) {
            findings.push({
              check: 'overrides',
              ...where,
              nodeId: nested.nodeId,
              field: 'componentKey',
              message: `${nested.path} inside an instance of ${instance.component} was swapped to another component`,
            });
          }
        }
      }
    }
  }
  return { findings };
};
