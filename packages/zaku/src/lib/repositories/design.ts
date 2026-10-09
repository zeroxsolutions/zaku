import { zakuConfigSchema, type ZakuConfig } from '../schema/zaku-config.js';
import { DesignFileInvalid, readDesignFile, readOptionalDesignFile } from './design-file.js';
import { designPaths } from './design-paths.js';
import { librarySnapshotSchema } from '../domain/library.js';
import { indexTitles, loadMaps } from './feature-maps.js';
import { loadOutlines } from './outlines.js';
import { recipeDocumentSchema } from '../domain/recipe.js';
import { tokenDocumentSchema } from '../domain/token-document.js';
import type { CheckInput, Finding } from '../domain/findings.js';

function schemaFinding(error: DesignFileInvalid): Finding {
  return { check: 'schema', message: error.message };
}

async function optional<T>(read: () => Promise<T | null>, findings: Finding[]): Promise<T | null> {
  try {
    return await read();
  } catch (error) {
    if (error instanceof DesignFileInvalid) {
      findings.push(schemaFinding(error));
      return null;
    }
    throw error;
  }
}

export async function loadDesign(root: string): Promise<{ input: CheckInput | null; findings: Finding[] }> {
  const paths = designPaths(root);
  const findings: Finding[] = [];
  let config: ZakuConfig;
  try {
    config = await readDesignFile(paths.config, zakuConfigSchema);
  } catch (error) {
    if (error instanceof DesignFileInvalid) return { input: null, findings: [schemaFinding(error)] };
    throw error;
  }
  const { maps, errors: mapErrors } = await loadMaps(paths.maps);
  findings.push(...mapErrors.map(schemaFinding));
  for (const key of indexTitles(maps).duplicates) {
    const [feature, title] = [key.slice(0, key.indexOf(': ')), key.slice(key.indexOf(': ') + 2)];
    findings.push({
      check: 'schema',
      feature,
      message: `two screens share the title ${title}; a frame name could not tell them apart`,
    });
  }
  const { outlines, unmapped, errors: outlineErrors } = await loadOutlines(paths.outline);
  findings.push(...outlineErrors.map(schemaFinding));
  const library = await optional(() => readOptionalDesignFile(paths.library, librarySnapshotSchema), findings);
  const tokens = await optional(() => readOptionalDesignFile(paths.tokens, tokenDocumentSchema), findings);
  const recipe = await optional(() => readOptionalDesignFile(paths.recipe, recipeDocumentSchema), findings);
  return {
    input: { config, maps, outlines, unmapped: unmapped?.frames ?? [], library, tokens, recipe },
    findings,
  };
}
