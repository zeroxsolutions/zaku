/** The named file has no zaku plugin open. */
export class FileNotConnected extends Error {
  constructor(
    readonly file: string,
    readonly files: readonly string[],
  ) {
    super(`FileNotConnected: ${file} is not connected; connected: ${files.join(', ') || 'none'}`);
    this.name = 'FileNotConnected';
  }
}
