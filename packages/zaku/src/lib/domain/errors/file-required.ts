/** More than one file is connected and the call named none. */
export class FileRequired extends Error {
  constructor(readonly files: readonly string[]) {
    super(`FileRequired: ${files.length} files are connected (${files.join(', ')}); name one as file`);
    this.name = 'FileRequired';
  }
}
