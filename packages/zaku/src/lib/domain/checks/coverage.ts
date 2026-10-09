import { frameName, resolveTargets } from '../feature-map.js';
import type { Check, Finding } from '../findings.js';

/** A frame name drops its feature, so a frame is known by its feature and its name together. */
function frameKey(feature: string, name: string): string {
  return `${feature}\n${name}`;
}

export const coverage: Check = ({ config, maps, outlines, unmapped }) => {
  const findings: Finding[] = [];
  const expected = new Map<string, { feature: string; screen: string; frame: string }>();
  for (const { map } of maps) {
    for (const [id, screen] of Object.entries(map.screens)) {
      const { targets, unknown } = resolveTargets(screen, config);
      for (const target of unknown) {
        findings.push({
          check: 'schema',
          feature: map.feature,
          screen: id,
          field: 'targets',
          message: `unknown target ${target}`,
        });
      }
      for (const state of screen.states) {
        for (const target of targets) {
          const name = frameName(target, screen, state);
          expected.set(frameKey(map.feature, name), {
            feature: map.feature,
            screen: id,
            frame: name,
          });
        }
      }
    }
  }
  const drawn = new Map<string, string>();
  for (const outline of outlines) {
    for (const frame of outline.frames) {
      const key = frameKey(outline.feature, frame.name);
      const first = drawn.get(key);
      if (first !== undefined) {
        findings.push({
          check: 'coverage',
          feature: outline.feature,
          screen: outline.screen,
          frame: frame.name,
          nodeId: frame.nodeId,
          message: `another frame, ${first}, has this name`,
        });
        continue;
      }
      drawn.set(key, frame.nodeId);
      if (!expected.has(key)) {
        findings.push({
          check: 'coverage',
          feature: outline.feature,
          screen: outline.screen,
          frame: frame.name,
          nodeId: frame.nodeId,
          message: 'a drawn frame has no state and target in the map',
        });
      }
    }
  }
  for (const [key, where] of expected) {
    if (!drawn.has(key))
      findings.push({
        check: 'coverage',
        ...where,
        message: 'no frame drawn for this state and target',
      });
  }
  for (const frame of unmapped) {
    findings.push({
      check: 'coverage',
      frame: frame.name,
      nodeId: frame.nodeId,
      message: 'a frame name resolves to no screen in the map',
    });
  }
  return { findings };
};
