import type { ICommandHandler } from '@zeroxsolutions/cosmic';
import { inject, injectable } from 'tsyringe';
import { decodePreset, type RunCommand } from '../adapters/shadcn-preset.js';
import { WriteTokens } from '../commands/index.js';
import { TOKENS } from '../constants/index.js';
import { dtcgTokenDocument, loadDtcgSchemes } from '../domain/dtcg.js';
import { CssRequired } from '../domain/errors/index.js';
import { parseThemeCss } from '../domain/theme-css.js';
import { buildTokenDocument, type TokenDocument } from '../domain/token-document.js';
import type { IDesignConfigRepository, ISourceFiles, ITokenDocumentRepository } from '../repositories/index.js';

export interface TokensWritten {
  path: string;
  colours: number;
  from: string;
}

/** Handles WriteTokens by reading the design system zaku.yaml names and writing its tokens document. */
@injectable({ token: TOKENS.COMMAND_HANDLER })
export class WriteTokensHandler implements ICommandHandler<WriteTokens, TokensWritten> {
  readonly command = WriteTokens;

  constructor(
    @inject(TOKENS.DESIGN_CONFIG_REPOSITORY) private readonly configs: IDesignConfigRepository,
    @inject(TOKENS.TOKEN_DOCUMENT_REPOSITORY) private readonly documents: ITokenDocumentRepository,
    @inject(TOKENS.SOURCE_FILES) private readonly files: ISourceFiles,
    @inject(TOKENS.RUN_COMMAND) private readonly run: RunCommand,
  ) {}

  async handle(command: WriteTokens): Promise<TokensWritten> {
    const config = await this.configs.read(command.root);
    const system = config.designSystem;
    let doc: TokenDocument;
    let from: string;
    if ('shadcn' in system) {
      if (!command.css) throw new CssRequired();
      const preset = await decodePreset(system.shadcn.preset, this.run);
      doc = buildTokenDocument(preset, parseThemeCss(await this.files.readText(command.css)));
      from = `preset ${preset.code}`;
    } else {
      const read = (path: string): Promise<unknown> => this.files.readJson(path);
      doc = dtcgTokenDocument(system.dtcg, await loadDtcgSchemes(system.dtcg, read, command.cwd), config.product);
      from = 'from DTCG';
    }
    const path = await this.documents.save(command.root, doc);
    return {
      path,
      colours: Object.keys(doc.modifiers.scheme.contexts.light[0].color).length,
      from,
    };
  }
}
