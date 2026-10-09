import { qualify } from '../feature-map.js';
import type { Check, Finding } from '../findings.js';

export const prototype: Check = ({ maps, outlines }) => {
  if (outlines.length === 0) return { findings: [] };
  const screenOfFrame = new Map<string, string>();
  const outlineOf = new Map(outlines.map((outline) => [`${outline.feature}/${outline.screen}`, outline]));
  for (const outline of outlines) {
    for (const frame of outline.frames) screenOfFrame.set(frame.nodeId, `${outline.feature}/${outline.screen}`);
  }
  const findings: Finding[] = [];
  for (const { map } of maps) {
    for (const [id, screen] of Object.entries(map.screens)) {
      const outline = outlineOf.get(`${map.feature}/${id}`);
      if (!outline) continue;
      const where = { check: 'prototype' as const, feature: map.feature, screen: id };
      const links = outline.frames.flatMap((frame) => frame.links);
      if (screen.root && !outline.frames.some((frame) => frame.start)) {
        findings.push({ ...where, message: 'a root screen has no flow starting point' });
      } else if (screen.root) {
        // A flow starts on every target, at its first state's frame, so a reviewer opens the device they test on.
        const first = screen.states[0];
        for (const frame of outline.frames.filter((candidate) => candidate.state === first)) {
          if (!outline.frames.some((candidate) => candidate.target === frame.target && candidate.start)) {
            findings.push({
              ...where,
              frame: frame.name,
              nodeId: frame.nodeId,
              message: `a root screen starts no flow on ${frame.target}`,
            });
          }
        }
      }
      if (!screen.root && !links.some((link) => link.to === 'back')) {
        findings.push({ ...where, message: 'a screen that is not a root has no Back action' });
      }
      for (const exit of screen.exits) {
        const target = qualify(exit.to, map.feature);
        const connected = links.some((link) => link.to !== 'back' && screenOfFrame.get(link.to.nodeId) === target);
        if (!connected)
          findings.push({
            ...where,
            field: 'exits',
            message: `the exit to ${exit.to} (${exit.via}) has no connection`,
          });
      }
    }
  }
  return { findings };
};
