import type { ICommandHandler } from '@zeroxsolutions/cosmic';
import { inject, injectable } from 'tsyringe';
import { WriteSchemas } from '../commands/index.js';
import { TOKENS } from '../constants/index.js';
import type { IJsonSchemaFiles } from '../repositories/index.js';
import { designJsonSchemas } from '../schema/json-schemas.js';

/** Handles WriteSchemas by writing each design file's JSON Schema into the directory named. */
@injectable({ token: TOKENS.COMMAND_HANDLER })
export class WriteSchemasHandler implements ICommandHandler<WriteSchemas, string[]> {
  readonly command = WriteSchemas;

  constructor(@inject(TOKENS.JSON_SCHEMA_FILES) private readonly files: IJsonSchemaFiles) {}

  handle(command: WriteSchemas): Promise<string[]> {
    return this.files.write(command.out, designJsonSchemas());
  }
}
