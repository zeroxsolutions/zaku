import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { DesignFileInvalid, parseDesignFile } from './design-file.js';
import { featureMapSchema, type FeatureMap, type Screen } from '../domain/feature-map.js';

export interface LoadedMap {
  path: string;
  digest: string;
  map: FeatureMap;
}

export interface ScreenRef {
  feature: string;
  id: string;
  screen: Screen;
}

export function digestOf(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export async function loadMaps(dir: string): Promise<{ maps: LoadedMap[]; errors: DesignFileInvalid[] }> {
  let names: string[];
  try {
    names = (await readdir(dir)).filter((name) => name.endsWith('.yaml')).sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { maps: [], errors: [] };
    throw error;
  }
  const maps: LoadedMap[] = [];
  const errors: DesignFileInvalid[] = [];
  for (const name of names) {
    const path = join(dir, name);
    const text = await readFile(path, 'utf8');
    try {
      const map = parseDesignFile(path, text, featureMapSchema);
      if (`${map.feature}.yaml` !== basename(path)) {
        errors.push(new DesignFileInvalid(path, [`feature: ${map.feature} does not match the file name ${name}`]));
        continue;
      }
      maps.push({ path, digest: digestOf(text), map });
    } catch (error) {
      if (error instanceof DesignFileInvalid) errors.push(error);
      else throw error;
    }
  }
  return { maps, errors };
}

export function indexScreens(maps: readonly LoadedMap[]): Map<string, ScreenRef> {
  const index = new Map<string, ScreenRef>();
  for (const { map } of maps) {
    for (const [id, screen] of Object.entries(map.screens))
      index.set(`${map.feature}/${id}`, { feature: map.feature, id, screen });
  }
  return index;
}

/** A frame name carries the title without its feature, so a title is unique within its feature: `<feature>: <title>`. */
export function titleKey(feature: string, title: string): string {
  return `${feature}: ${title}`;
}

export function indexTitles(maps: readonly LoadedMap[]): {
  titles: Map<string, ScreenRef>;
  duplicates: string[];
} {
  const titles = new Map<string, ScreenRef>();
  const duplicates: string[] = [];
  for (const ref of indexScreens(maps).values()) {
    const key = titleKey(ref.feature, ref.screen.title);
    if (titles.has(key)) duplicates.push(key);
    else titles.set(key, ref);
  }
  return { titles, duplicates };
}
