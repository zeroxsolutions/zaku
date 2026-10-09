import { DomainCommand } from '@zeroxsolutions/cosmic';

export interface WriteOutlineInput {
  /** The design directory, absolute. */
  root: string;
  /** Only these frame ids; every screen frame when null. */
  frames: readonly string[] | null;
}

/** Read the product file's frames into the outline directory. */
export class WriteOutline extends DomainCommand implements WriteOutlineInput {
  readonly root: string;
  readonly frames: readonly string[] | null;

  constructor(input: WriteOutlineInput) {
    super();
    this.root = input.root;
    this.frames = input.frames;
  }
}
