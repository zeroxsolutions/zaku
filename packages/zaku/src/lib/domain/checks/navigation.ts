import { indexScreens } from '../../repositories/feature-maps.js';
import { qualify, resolveTargets } from '../feature-map.js';
import type { Check, Finding } from '../findings.js';

export const reachability: Check = ({ maps }) => {
  const index = indexScreens(maps);
  const findings: Finding[] = [];
  for (const { map } of maps) {
    for (const [id, screen] of Object.entries(map.screens)) {
      const where = { feature: map.feature, screen: id };
      for (const entry of screen.entry) {
        if (entry.from !== undefined && !index.has(qualify(entry.from, map.feature))) {
          findings.push({
            check: 'reachability',
            ...where,
            field: 'entry',
            message: `entry from ${entry.from} names no screen`,
          });
        }
      }
      for (const exit of screen.exits) {
        if (!index.has(qualify(exit.to, map.feature))) {
          findings.push({
            check: 'reachability',
            ...where,
            field: 'exits',
            message: `exit to ${exit.to} names no screen`,
          });
        }
      }
      if (!screen.root && screen.entry.length === 0) {
        findings.push({
          check: 'reachability',
          ...where,
          field: 'entry',
          message: 'a screen that is not a root has no entry',
        });
      }
    }
  }
  return { findings };
};

export const wayBack: Check = ({ maps, config }) => {
  const findings: Finding[] = [];
  for (const { map } of maps) {
    for (const [id, screen] of Object.entries(map.screens)) {
      if (screen.root) continue;
      const families = [...new Set(resolveTargets(screen, config).targets.map((target) => target.family))];
      for (const family of families) {
        if (!screen.back[family]?.trim()) {
          findings.push({
            check: 'way-back',
            feature: map.feature,
            screen: id,
            field: `back.${family}`,
            message: `no way back on ${family}`,
          });
        }
      }
    }
  }
  return { findings };
};
