import { EN_TELLS } from './en.js';

/** A phrase that marks copy as generated, and the plain wording a message offers in its place. */
export interface CopyTell {
  pattern: RegExp;
  /** Starts with the verb a reader acts on: `write "use"`, `delete it`. */
  instead: string;
}

/** The tell list of each language that has one; a language joins once a run shows what a model writes in it. */
export const COPY_TELLS: Readonly<Partial<Record<string, readonly CopyTell[]>>> = { en: EN_TELLS };
