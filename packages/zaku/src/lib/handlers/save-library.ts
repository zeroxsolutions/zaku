import type { ICommandHandler } from '@zeroxsolutions/cosmic';
import { inject, injectable } from 'tsyringe';
import { SaveLibrary } from '../commands/index.js';
import { TOKENS } from '../constants/index.js';
import { writeFile } from 'node:fs/promises';
import { zakuConfigSchema } from '../schema/zaku-config.js';
import { readDesignFile } from '../repositories/design-file.js';
import { designPaths } from '../repositories/design-paths.js';
import type { FigmaRest } from '../adapters/figma-rest.js';
import { librarySnapshotSchema, type LibrarySnapshot, type VariablePart } from '../domain/library.js';
import { readLibrary } from '../adapters/figma-rest-library.js';

export async function saveLibrary(options: {
  root: string;
  part: VariablePart;
  rest: FigmaRest;
}): Promise<LibrarySnapshot> {
  const paths = designPaths(options.root);
  const config = await readDesignFile(paths.config, zakuConfigSchema);
  const snapshot = librarySnapshotSchema.parse(
    await readLibrary({ rest: options.rest, fileKey: config.figma.library, part: options.part }),
  );
  await writeFile(paths.library, `${JSON.stringify(snapshot, null, 2)}\n`);
  return snapshot;
}

/** Handles SaveLibrary by reading the library over REST, joining the variables export, and writing library.json. */
@injectable({ token: TOKENS.COMMAND_HANDLER })
export class SaveLibraryHandler implements ICommandHandler<SaveLibrary, LibrarySnapshot> {
  readonly command = SaveLibrary;

  constructor(@inject(TOKENS.FIGMA_REST) private readonly rest: FigmaRest) {}

  handle(command: SaveLibrary): Promise<LibrarySnapshot> {
    return saveLibrary({ root: command.root, part: command.part, rest: this.rest });
  }
}
