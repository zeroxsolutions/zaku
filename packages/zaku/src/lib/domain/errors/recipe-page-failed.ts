/** The recipe page could not be read or folded into a recipe; the message names what it got wrong. */
export class RecipePageFailed extends Error {
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = 'RecipePageFailed';
  }
}
