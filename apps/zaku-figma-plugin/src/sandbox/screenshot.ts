import { SCREENSHOT_LIMITS, type PluginMessage, type ServerMessage } from '@zeroxsolutions/zaku/schema';

type Exportable = {
  name: string;
  type: string;
  width?: number;
  height?: number;
  exportAsync?: (settings: { format: 'PNG'; constraint: { type: 'SCALE'; value: number } }) => Promise<Uint8Array>;
};

/** What a render reads of Figma: a node by its id, and the base64 of the bytes it exported. */
export interface ScreenshotHost {
  getNodeByIdAsync(id: string): Promise<Exportable | null>;
  base64Encode(data: Uint8Array): string;
}

type Answer = Extract<PluginMessage, { type: 'exported' | 'export-refused' }>;

/**
 * Renders the node the server asked for as a PNG with exportAsync, at the scale asked or the one that puts its
 * longer side at maxDimension. A render too large is refused with its size rather than made smaller: the server
 * says which smaller call to make, so what the model sees is always what it asked for.
 */
export async function renderScreenshot(
  host: ScreenshotHost,
  message: Extract<ServerMessage, { type: 'export' }>,
): Promise<Answer> {
  const { requestId, nodeId, size, maxBytes } = message;
  const node = await host.getNodeByIdAsync(nodeId);
  if (!node) return { type: 'export-refused', requestId, reason: 'missing' };
  // A page and the document have no exportAsync of their own here, and no box to render.
  if (!node.exportAsync || node.type === 'PAGE' || node.type === 'DOCUMENT')
    return { type: 'export-refused', requestId, reason: 'not-exportable' };
  const longer = Math.max(node.width ?? 0, node.height ?? 0, 1);
  const scale = 'scale' in size ? size.scale : Math.min(size.maxDimension / longer, SCREENSHOT_LIMITS.maxUpscale);
  const width = Math.round((node.width ?? 0) * scale);
  const height = Math.round((node.height ?? 0) * scale);
  if (Math.max(width, height) > SCREENSHOT_LIMITS.maxDimension)
    return { type: 'export-refused', requestId, reason: 'too-large', width, height };
  let bytes: Uint8Array;
  try {
    bytes = await node.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: scale } });
  } catch (error) {
    return { type: 'export-refused', requestId, reason: 'failed', error: String(error) };
  }
  if (bytes.length > maxBytes)
    return { type: 'export-refused', requestId, reason: 'too-large', bytes: bytes.length, width, height };
  return { type: 'exported', requestId, name: node.name, width, height, scale, png: host.base64Encode(bytes) };
}
