/** A command needs a Figma file that zaku.yaml does not name. */
export class FigmaFileKeyMissing extends Error {
  constructor(readonly field: 'figma.library' | 'figma.product') {
    super(
      `${field} is not set in zaku.yaml: put the key from the file's address (figma.com/design/<key>/...) there; zaku never creates the file`,
    );
    this.name = 'FigmaFileKeyMissing';
  }
}
