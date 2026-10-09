import { injectable } from 'tsyringe';
import { TOKENS } from '../constants/tokens.js';
import type { TokenDocument } from '../domain/token-document.js';
import { writeDesignFile } from './design-file.js';
import { designPaths } from './design-paths.js';

export interface ITokenDocumentRepository {
  /** Returns the path written. */
  save(root: string, doc: TokenDocument): Promise<string>;
}

/** The design directory's tokens document. */
@injectable({ token: TOKENS.TOKEN_DOCUMENT_REPOSITORY })
export class TokenDocumentRepository implements ITokenDocumentRepository {
  async save(root: string, doc: TokenDocument): Promise<string> {
    const path = designPaths(root).tokens;
    await writeDesignFile(path, doc);
    return path;
  }
}
