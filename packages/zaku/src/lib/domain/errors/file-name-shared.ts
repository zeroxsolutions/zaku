/** Two connected files share the name a call gave; the agent names one by its fileId. */
export class FileNameShared extends Error {
  constructor(
    readonly file: string,
    readonly matches: readonly { fileId: string | null; pages: readonly string[] }[],
  ) {
    super(
      `FileNameShared: ${matches.length} connected files are named ${file}; name one by its fileId: ${matches
        .map((match) => `${match.fileId ?? 'no id'} (pages: ${match.pages.join(', ')})`)
        .join('; ')}`,
    );
    this.name = 'FileNameShared';
  }
}
