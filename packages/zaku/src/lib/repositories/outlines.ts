import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { DesignFileInvalid, readDesignFile, readOptionalDesignFile } from './design-file.js';
import { screenOutlineSchema, unmappedSchema, type ScreenOutline, type Unmapped } from '../domain/outline.js';

export function outlinePath(dir: string, feature: string, screen: string): string {
  return join(dir, feature, `${screen}.yaml`);
}

export async function loadOutlines(
  dir: string,
): Promise<{ outlines: ScreenOutline[]; unmapped: Unmapped | null; errors: DesignFileInvalid[] }> {
  const outlines: ScreenOutline[] = [];
  const errors: DesignFileInvalid[] = [];
  let features: string[];
  try {
    features = (await readdir(dir, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { outlines, unmapped: null, errors };
    throw error;
  }
  for (const feature of features) {
    const files = (await readdir(join(dir, feature))).filter((name) => name.endsWith('.yaml')).sort();
    for (const file of files) {
      try {
        outlines.push(await readDesignFile(join(dir, feature, file), screenOutlineSchema));
      } catch (error) {
        if (error instanceof DesignFileInvalid) errors.push(error);
        else throw error;
      }
    }
  }
  let unmapped: Unmapped | null = null;
  try {
    unmapped = await readOptionalDesignFile(join(dir, 'unmapped.yaml'), unmappedSchema);
  } catch (error) {
    if (error instanceof DesignFileInvalid) errors.push(error);
    else throw error;
  }
  return { outlines, unmapped, errors };
}
