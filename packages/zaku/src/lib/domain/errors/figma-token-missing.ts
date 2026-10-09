/** A command that reads Figma over REST was run with no FIGMA_TOKEN. */
export class FigmaTokenMissing extends Error {
  constructor(command: string) {
    super(`${command} needs FIGMA_TOKEN, a Figma personal access token with file read access`);
    this.name = 'FigmaTokenMissing';
  }
}
