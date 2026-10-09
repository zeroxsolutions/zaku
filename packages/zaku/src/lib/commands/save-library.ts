import { DomainCommand } from '@zeroxsolutions/cosmic';
import type { VariablePart } from '../domain/library.js';

export interface SaveLibraryInput {
  /** The design directory, absolute. */
  root: string;
  /** What use_figma returned for zaku library script. */
  part: VariablePart;
}

/** Write library.json from the library components and the variables export. */
export class SaveLibrary extends DomainCommand implements SaveLibraryInput {
  readonly root: string;
  readonly part: VariablePart;

  constructor(input: SaveLibraryInput) {
    super();
    this.root = input.root;
    this.part = input.part;
  }
}
