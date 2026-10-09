import type { Check, Finding } from '../findings.js';

export const font: Check = ({ outlines, library }) => {
  if (!library) return { notRun: 'library.json is missing' };
  const keys = new Set(library.textStyles.map((style) => style.key));
  const findings: Finding[] = [];
  for (const outline of outlines) {
    for (const frame of outline.frames) {
      const where = { feature: outline.feature, screen: outline.screen, frame: frame.name };
      for (const text of frame.texts) {
        if (text.styleKey === null) {
          findings.push({
            check: 'font',
            ...where,
            nodeId: text.nodeId,
            message: 'text outside a component uses no library text style',
          });
        } else if (!keys.has(text.styleKey)) {
          findings.push({
            check: 'font',
            ...where,
            nodeId: text.nodeId,
            message: 'text uses a style the library does not publish',
          });
        }
      }
    }
  }
  return { findings };
};
