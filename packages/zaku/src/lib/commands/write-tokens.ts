import { DomainCommand } from '@zeroxsolutions/cosmic';

export interface WriteTokensInput {
  /** The design directory, absolute. */
  root: string;
  /** The product root, absolute; DTCG token files resolve against it. */
  cwd: string;
  /** The stylesheet declaring :root and .dark, absolute; required for a shadcn design system. */
  css: string | null;
}

/** Write the code's tokens to tokens.json, from the design system zaku.yaml names. */
export class WriteTokens extends DomainCommand implements WriteTokensInput {
  readonly root: string;
  readonly cwd: string;
  readonly css: string | null;

  constructor(input: WriteTokensInput) {
    super();
    this.root = input.root;
    this.cwd = input.cwd;
    this.css = input.css;
  }
}
