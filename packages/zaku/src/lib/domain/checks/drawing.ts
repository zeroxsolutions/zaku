import { DEFAULT_SYSTEM_BARS } from '../../schema/zaku-config.js';
import type { Check, Finding } from '../findings.js';

export const images: Check = ({ outlines }) => {
  const findings: Finding[] = [];
  for (const outline of outlines) {
    for (const frame of outline.frames) {
      for (const image of frame.images) {
        if (!image.filled) {
          findings.push({
            check: 'images',
            feature: outline.feature,
            screen: outline.screen,
            frame: frame.name,
            nodeId: image.nodeId,
            message: `${image.name} is named for a picture and holds no image`,
          });
        }
      }
    }
  }
  return { findings };
};

export const frameCheck: Check = ({ config, outlines }) => {
  const sizes = new Map(config.targets.map((target) => [target.id, target.size]));
  const findings: Finding[] = [];
  for (const outline of outlines) {
    for (const frame of outline.frames) {
      const size = sizes.get(frame.target);
      if (!size) continue;
      if (Math.abs(frame.size.width - size.width) > 0.5 || Math.abs(frame.size.height - size.height) > 0.5) {
        findings.push({
          check: 'frame',
          feature: outline.feature,
          screen: outline.screen,
          frame: frame.name,
          nodeId: frame.nodeId,
          field: 'size',
          message: `${frame.size.width}x${frame.size.height} is not the ${frame.target} size ${size.width}x${size.height}`,
        });
      }
    }
  }
  return { findings };
};

export const systemBars: Check = ({ config, outlines }) => {
  const families = new Map(config.targets.map((target) => [target.id, target.family]));
  const bars = { ...DEFAULT_SYSTEM_BARS, ...config.systemBars };
  const findings: Finding[] = [];
  for (const outline of outlines) {
    for (const frame of outline.frames) {
      const family = families.get(frame.target);
      if (!family) continue;
      const held = new Set(frame.instances.map((instance) => instance.component));
      for (const names of bars[family]) {
        if (!names.some((name) => held.has(name))) {
          findings.push({
            check: 'system-bars',
            feature: outline.feature,
            screen: outline.screen,
            frame: frame.name,
            nodeId: frame.nodeId,
            message: `no ${names.join(' or ')} instance on a ${family} frame`,
          });
        }
      }
    }
  }
  return { findings };
};

/** A frame sits in its screen's Section and its state's Section. */
export const placement: Check = ({ maps, outlines }) => {
  const titles = new Map(
    maps.flatMap(({ map }) =>
      Object.entries(map.screens).map(([id, screen]) => [`${map.feature}/${id}`, screen.title]),
    ),
  );
  const findings: Finding[] = [];
  for (const outline of outlines) {
    const title = titles.get(`${outline.feature}/${outline.screen}`);
    for (const frame of outline.frames) {
      const expected = [title, frame.state];
      if (frame.containers.length !== 2 || frame.containers[0] !== expected[0] || frame.containers[1] !== expected[1]) {
        findings.push({
          check: 'placement',
          feature: outline.feature,
          screen: outline.screen,
          frame: frame.name,
          nodeId: frame.nodeId,
          message: `sits in ${frame.containers.length > 0 ? frame.containers.join(' > ') : 'no Section'}, not in ${expected.join(' > ')}`,
        });
      }
    }
  }
  return { findings };
};

export const naming: Check = ({ outlines }) => {
  const findings: Finding[] = [];
  for (const outline of outlines) {
    for (const frame of outline.frames) {
      for (const layer of frame.defaultNames) {
        findings.push({
          check: 'naming',
          feature: outline.feature,
          screen: outline.screen,
          frame: frame.name,
          nodeId: layer.nodeId,
          message: `${layer.name} keeps a default name`,
        });
      }
    }
  }
  return { findings };
};

/** A block of plain layers, with children, whose shape repeats in two frames of one screen. */
export const component: Check = ({ outlines }) => {
  const findings: Finding[] = [];
  for (const outline of outlines) {
    const seen = new Map<string, { frame: string; nodeId: string; name: string }[]>();
    for (const frame of outline.frames) {
      for (const raw of frame.raw) {
        if (!raw.signature.includes('(')) continue;
        seen.set(raw.signature, [
          ...(seen.get(raw.signature) ?? []),
          { frame: frame.name, nodeId: raw.nodeId, name: raw.name },
        ]);
      }
    }
    for (const places of seen.values()) {
      if (new Set(places.map((place) => place.frame)).size < 2) continue;
      for (const place of places) {
        findings.push({
          check: 'component',
          feature: outline.feature,
          screen: outline.screen,
          frame: place.frame,
          nodeId: place.nodeId,
          message: `${place.name} repeats in ${places.length} places as plain layers; make it a component`,
        });
      }
    }
  }
  return { findings };
};
