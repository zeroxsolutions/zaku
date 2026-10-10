/** get_screenshot found no node to render under the id, or one with no image of its own, such as a page. */
export class NodeNotRendered extends Error {
  constructor(nodeId: string, reason: 'missing' | 'not-exportable' | 'failed', detail?: string) {
    const what =
      reason === 'missing'
        ? `NodeNotRendered: no node with id ${nodeId} is in the file.`
        : reason === 'not-exportable'
          ? `NodeNotRendered: ${nodeId} is a page or the document, which has no image of its own.`
          : `NodeNotRendered: Figma could not render ${nodeId}${detail ? `: ${detail}` : ''}.`;
    super(
      `${what} Nothing was rendered. Call read with the frame's path (Page/Frame) for the id of a frame or a layer, and call get_screenshot with that id.`,
    );
    this.name = 'NodeNotRendered';
  }
}
