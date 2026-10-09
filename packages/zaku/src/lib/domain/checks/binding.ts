import type { Check, Finding } from '../findings.js';

const PAINTS = ['fill', 'stroke', 'textColor', 'glyph'] as const;
/** The semantic layer's groups; an axis token bound directly ties a component to one preset. */
const SEMANTIC = /^(color|mode|radius)\//;

export const binding: Check = ({ library }) => {
  if (!library) return { notRun: 'library.json is missing' };
  const findings: Finding[] = [];
  for (const component of library.components) {
    for (const variant of component.variants) {
      for (const item of variant.modes[0]?.items ?? []) {
        const label = `${component.name} ${variant.name} ${item.path || '(root)'}`;
        for (const field of PAINTS) {
          const value = item[field];
          const bound = item.bindings[field];
          if (value && value.a > 0 && !bound) {
            findings.push({
              check: 'binding',
              nodeId: item.nodeId,
              field,
              message: `${label}: ${field} is a raw value`,
            });
          } else if (bound && !SEMANTIC.test(bound)) {
            findings.push({
              check: 'binding',
              nodeId: item.nodeId,
              field,
              message: `${label}: ${field} is bound to ${bound}, which is not a semantic token`,
            });
          }
        }
        const radius = item.bindings['radius'];
        if (item.radii !== null && item.radii.some((corner) => corner > 0) && !radius) {
          findings.push({
            check: 'binding',
            nodeId: item.nodeId,
            field: 'radius',
            message: `${label}: radius is a raw value`,
          });
        } else if (radius && !SEMANTIC.test(radius)) {
          findings.push({
            check: 'binding',
            nodeId: item.nodeId,
            field: 'radius',
            message: `${label}: radius is bound to ${radius}, which is not a semantic token`,
          });
        }
        if (item.type.toUpperCase() === 'TEXT' && item.textStyleKey === null) {
          findings.push({
            check: 'binding',
            nodeId: item.nodeId,
            field: 'textStyle',
            message: `${label}: text has no library text style`,
          });
        }
      }
    }
  }
  return { findings };
};
