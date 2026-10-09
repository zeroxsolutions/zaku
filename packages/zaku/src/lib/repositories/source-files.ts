import { readFile } from 'node:fs/promises';
import { injectable } from 'tsyringe';
import { TOKENS } from '../constants/tokens.js';

/** The product's own files zaku reads from: a theme stylesheet, DTCG token files. */
export interface ISourceFiles {
  readText(path: string): Promise<string>;
  readJson(path: string): Promise<unknown>;
}

@injectable({ token: TOKENS.SOURCE_FILES })
export class SourceFiles implements ISourceFiles {
  readText(path: string): Promise<string> {
    return readFile(path, 'utf8');
  }

  async readJson(path: string): Promise<unknown> {
    return JSON.parse(await readFile(path, 'utf8'));
  }
}
