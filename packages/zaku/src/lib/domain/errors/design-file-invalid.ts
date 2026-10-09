/** A design file that does not parse against its schema, with each issue it has. */
export class DesignFileInvalid extends Error {
  constructor(
    readonly path: string,
    readonly issues: readonly string[],
  ) {
    super(`${path}: ${issues.join('; ')}`);
    this.name = 'DesignFileInvalid';
  }
}
