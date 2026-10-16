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

/** Whether an instance sizes itself on either axis by filling or hugging, rather than at a fixed size. */
export function stretches(sizing: { horizontal: string; vertical: string }): boolean {
  return sizing.horizontal !== 'FIXED' || sizing.vertical !== 'FIXED';
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
