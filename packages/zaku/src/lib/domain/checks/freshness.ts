import type { Check, Finding } from '../findings.js';

export const freshness: Check = ({ maps, outlines, library }) => {
  const digests = new Map(maps.map((loaded) => [loaded.map.feature, loaded.digest]));
  const findings: Finding[] = [];
  for (const outline of outlines) {
    const where = { feature: outline.feature, screen: outline.screen };
    const digest = digests.get(outline.feature);
    if (digest !== undefined && digest !== outline.mapDigest) {
      findings.push({
        check: 'freshness',
        ...where,
        message: 'the map changed after this outline was read; run zaku outline',
      });
    }
    if (library && outline.libraryVersion !== library.version) {
      findings.push({
        check: 'freshness',
        ...where,
        message: 'the library changed after this outline was read; run zaku outline',
      });
    }
  }
  return { findings };
};
