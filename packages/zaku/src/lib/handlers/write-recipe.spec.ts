import { container } from 'tsyringe';
import { WriteRecipe } from '../commands/index.js';
import { TOKENS } from '../constants/index.js';
import { RecipePageFailed, RecipeUrlRequired } from '../domain/errors/index.js';
import { testConfig } from '../../test/fixtures.fixture.js';
import { WriteRecipeHandler } from './write-recipe.js';

describe('WriteRecipeHandler', () => {
  it('refuses when neither zaku.yaml nor the command names the recipe page', async () => {
    const config = testConfig();
    const scope = container.createChildContainer();
    scope.register(TOKENS.DESIGN_CONFIG_REPOSITORY, {
      useValue: { read: async () => config, readOptional: async () => config },
    });
    scope.register(TOKENS.RECIPE_REPOSITORY, { useValue: { save: async () => '/d/recipe.json' } });
    scope.register(TOKENS.RECIPE_PAGE_READER, { useValue: async () => ({ light: [], dark: [] }) });
    const handle = scope.resolve(WriteRecipeHandler).handle(new WriteRecipe({ root: '/d', url: null }));
    await expect(handle).rejects.toBeInstanceOf(RecipeUrlRequired);
  });
});

describe('WriteRecipeHandler, reading the page', () => {
  it('names what the page got wrong as a recipe page failure', async () => {
    const config = testConfig();
    const scope = container.createChildContainer();
    scope.register(TOKENS.DESIGN_CONFIG_REPOSITORY, {
      useValue: { read: async () => config, readOptional: async () => config },
    });
    scope.register(TOKENS.RECIPE_REPOSITORY, { useValue: { save: async () => '/d/recipe.json' } });
    scope.register(TOKENS.RECIPE_PAGE_READER, {
      useValue: async () => Promise.reject(new Error('marks no element')),
    });
    const handle = scope.resolve(WriteRecipeHandler).handle(new WriteRecipe({ root: '/d', url: 'http://x' }));
    await expect(handle).rejects.toThrow(new RecipePageFailed(new Error('marks no element')));
  });
});
