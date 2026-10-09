import { injectable } from 'tsyringe';
import { TOKENS } from '../constants/tokens.js';
import type { RecipeDocument } from '../domain/recipe.js';
import { writeDesignFile } from './design-file.js';
import { designPaths } from './design-paths.js';

export interface IRecipeRepository {
  /** Returns the path written. */
  save(root: string, doc: RecipeDocument): Promise<string>;
}

/** The design directory's recipe document. */
@injectable({ token: TOKENS.RECIPE_REPOSITORY })
export class RecipeRepository implements IRecipeRepository {
  async save(root: string, doc: RecipeDocument): Promise<string> {
    const path = designPaths(root).recipe;
    await writeDesignFile(path, doc);
    return path;
  }
}
