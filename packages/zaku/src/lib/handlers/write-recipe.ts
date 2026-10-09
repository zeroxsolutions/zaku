import type { ICommandHandler } from '@zeroxsolutions/cosmic';
import { inject, injectable } from 'tsyringe';
import type { RecipePageReader } from '../adapters/playwright-recipe-page.js';
import { WriteRecipe } from '../commands/index.js';
import { TOKENS } from '../constants/index.js';
import { buildRecipe } from '../domain/build-recipe.js';
import { PlaywrightMissing, RecipePageFailed, RecipeUrlRequired } from '../domain/errors/index.js';
import type { RecipeDocument } from '../domain/recipe.js';
import type { IDesignConfigRepository, IRecipeRepository } from '../repositories/index.js';

export interface RecipeWritten {
  path: string;
  components: number;
  variants: number;
}

/** Handles WriteRecipe by reading the product's recipe page in light and dark and writing recipe.json. */
@injectable({ token: TOKENS.COMMAND_HANDLER })
export class WriteRecipeHandler implements ICommandHandler<WriteRecipe, RecipeWritten> {
  readonly command = WriteRecipe;

  constructor(
    @inject(TOKENS.DESIGN_CONFIG_REPOSITORY) private readonly configs: IDesignConfigRepository,
    @inject(TOKENS.RECIPE_REPOSITORY) private readonly recipes: IRecipeRepository,
    @inject(TOKENS.RECIPE_PAGE_READER) private readonly readPage: RecipePageReader,
  ) {}

  async handle(command: WriteRecipe): Promise<RecipeWritten> {
    const config = await this.configs.read(command.root);
    const url = command.url ?? config.recipe?.url;
    if (!url) throw new RecipeUrlRequired();
    let doc: RecipeDocument;
    try {
      doc = buildRecipe(
        await this.readPage({
          url,
          dark: config.recipe?.dark ?? 'class',
          darkClass: config.recipe?.darkClass ?? 'dark',
        }),
      );
    } catch (error) {
      if (error instanceof PlaywrightMissing) throw error;
      throw new RecipePageFailed(error);
    }
    const path = await this.recipes.save(command.root, doc);
    const variants = doc.components
      .flatMap((component) => component.variants)
      .filter((variant) => variant.scheme === 'light').length;
    return { path, components: doc.components.length, variants };
  }
}
