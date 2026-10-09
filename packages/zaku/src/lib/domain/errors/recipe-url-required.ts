/** Neither zaku.yaml nor the command names the product's recipe page. */
export class RecipeUrlRequired extends Error {
  constructor() {
    super("zaku recipe needs the product's recipe page: recipe.url in zaku.yaml, or --url");
    this.name = 'RecipeUrlRequired';
  }
}
