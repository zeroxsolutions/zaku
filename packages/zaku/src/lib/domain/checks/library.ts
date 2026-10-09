import { systemBarNames } from '../../schema/zaku-config.js';
import type { Check, Finding } from '../findings.js';

/**
 * A product's own components and the system bars a platform kit supplies are not the library's, so
 * neither is held to its published variants.
 */
export const libraryCheck: Check = ({ config, maps, outlines, library }) => {
  if (!library) return { notRun: 'library.json is missing' };
  const bars = systemBarNames(config);
  const owned = outlines.flatMap((outline) =>
    outline.frames.flatMap((frame) =>
      frame.instances.filter((instance) => instance.local).map((instance) => instance.component),
    ),
  );
  const names = new Set([...library.components.map((component) => component.name), ...owned]);
  const keys = new Set(library.components.flatMap((component) => component.variants.map((variant) => variant.key)));
  const findings: Finding[] = [];
  for (const { map } of maps) {
    for (const [id, screen] of Object.entries(map.screens)) {
      for (const name of screen.components) {
        if (!names.has(name)) {
          findings.push({
            check: 'library',
            feature: map.feature,
            screen: id,
            field: 'components',
            message: `${name} is not a library component`,
          });
        }
      }
    }
  }
  for (const outline of outlines) {
    for (const frame of outline.frames) {
      const where = { feature: outline.feature, screen: outline.screen, frame: frame.name };
      for (const instance of frame.instances) {
        if (!instance.local && !bars.has(instance.component) && !keys.has(instance.componentKey)) {
          findings.push({
            check: 'library',
            ...where,
            nodeId: instance.nodeId,
            message: `an instance of ${instance.component} is not a published library variant`,
          });
        }
      }
      for (const raw of frame.raw) {
        findings.push({
          check: 'library',
          ...where,
          nodeId: raw.nodeId,
          message: `${raw.reason} (${raw.type} "${raw.name}")`,
        });
      }
    }
  }
  return { findings };
};
