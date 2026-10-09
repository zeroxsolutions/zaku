import { systemBarNames } from '../../schema/zaku-config.js';
import { indexScreens } from '../../repositories/feature-maps.js';
import type { Check, Finding } from '../findings.js';

/** Words only a template leaves behind: a product can show Title or Value, but never Lorem ipsum or Label. */
const PLACEHOLDER = /^(lorem ipsum.*|placeholder|text|label|button|item \d+)$/i;

export const copy: Check = ({ config, maps, outlines }) => {
  const screens = indexScreens(maps);
  const bars = systemBarNames(config);
  const findings: Finding[] = [];
  for (const outline of outlines) {
    const byState = new Map<string, Map<string, string>>();
    for (const frame of outline.frames) {
      const where = { feature: outline.feature, screen: outline.screen, frame: frame.name };
      const texts = [
        ...frame.texts.map((text) => ({ nodeId: text.nodeId, characters: text.characters })),
        ...frame.instances
          .filter((instance) => !bars.has(instance.component))
          .flatMap((instance) => instance.texts.map((text) => ({ nodeId: text.nodeId, characters: text.characters }))),
      ];
      for (const text of texts) {
        const trimmed = text.characters.trim();
        if (trimmed === '') findings.push({ check: 'copy', ...where, nodeId: text.nodeId, message: 'empty text' });
        else if (PLACEHOLDER.test(trimmed))
          findings.push({
            check: 'copy',
            ...where,
            nodeId: text.nodeId,
            message: `placeholder copy: ${trimmed}`,
          });
      }
      const signatures = byState.get(frame.state) ?? new Map<string, string>();
      signatures.set(
        frame.target,
        texts
          .map((text) => text.characters.trim())
          .sort()
          .join('\n'),
      );
      byState.set(frame.state, signatures);
    }
    if (screens.get(`${outline.feature}/${outline.screen}`)?.screen['copy-varies']) continue;
    for (const [state, signatures] of byState) {
      if (new Set(signatures.values()).size > 1) {
        findings.push({
          check: 'copy',
          feature: outline.feature,
          screen: outline.screen,
          field: state,
          message: `copy differs between ${[...signatures.keys()].join(', ')} in state ${state}`,
        });
      }
    }
  }
  return { findings };
};
