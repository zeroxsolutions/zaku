import { DomainCommand } from '@zeroxsolutions/cosmic';

export interface WriteRecipeInput {
  /** The design directory, absolute. */
  root: string;
  /** The recipe page, when it is not zaku.yaml's recipe.url. */
  url: string | null;
}

/** Write what the code computes for every variant to recipe.json. */
export class WriteRecipe extends DomainCommand implements WriteRecipeInput {
  readonly root: string;
  readonly url: string | null;

  constructor(input: WriteRecipeInput) {
    super();
    this.root = input.root;
    this.url = input.url;
  }
}
