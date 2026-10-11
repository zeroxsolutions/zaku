/** Another agent session writes this file; reads stay open, a second writer is refused. */
export class FileHeldByAnotherSession extends Error {
  constructor(
    readonly file: string,
    readonly holderCwd: string,
    readonly lastWrite: number,
  ) {
    super(
      `FileHeldByAnotherSession: ${file} is being written by the session in ${holderCwd} (last write ${new Date(
        lastWrite,
      ).toISOString()}); write it from that session, or wait until that session ends or 15 minutes pass`,
    );
    this.name = 'FileHeldByAnotherSession';
  }
}
