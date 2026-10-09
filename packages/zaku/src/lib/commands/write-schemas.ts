import { DomainCommand } from '@zeroxsolutions/cosmic';

export interface WriteSchemasInput {
  /** The directory to write them into, absolute. */
  out: string;
}

/** Write the JSON Schemas an editor reads for the design files. */
export class WriteSchemas extends DomainCommand implements WriteSchemasInput {
  readonly out: string;

  constructor(input: WriteSchemasInput) {
    super();
    this.out = input.out;
  }
}
