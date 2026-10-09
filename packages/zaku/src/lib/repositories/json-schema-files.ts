import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { injectable } from 'tsyringe';
import { TOKENS } from '../constants/tokens.js';
import { writeDesignFile } from './design-file.js';

export interface IJsonSchemaFiles {
  write(dir: string, schemas: Record<string, unknown>): Promise<string[]>;
}

/** The JSON Schema files an editor reads for the design files. */
@injectable({ token: TOKENS.JSON_SCHEMA_FILES })
export class JsonSchemaFiles implements IJsonSchemaFiles {
  async write(dir: string, schemas: Record<string, unknown>): Promise<string[]> {
    await mkdir(dir, { recursive: true });
    const written: string[] = [];
    for (const [name, schema] of Object.entries(schemas)) {
      const path = join(dir, name);
      await writeDesignFile(path, schema);
      written.push(path);
    }
    return written;
  }
}
