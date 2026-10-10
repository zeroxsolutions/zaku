import { SCREENSHOT_LIMITS } from '@zeroxsolutions/zaku/schema';
import { renderScreenshot, type ScreenshotHost } from './screenshot.js';

/** A file of one page holding one frame, whose exports are recorded and answered with `bytes` bytes. */
function file(
  frame: { width: number; height: number },
  bytes = 1000,
  fails = false,
): { host: ScreenshotHost; exports: unknown[] } {
  const exports: unknown[] = [];
  const node = {
    id: '1:1',
    name: 'Nova / Button',
    type: 'FRAME',
    ...frame,
    exportAsync: async (settings: unknown): Promise<Uint8Array> => {
      exports.push(settings);
      if (fails) throw new Error('in exportAsync: node has no visible content');
      return new Uint8Array(bytes);
    },
  };
  const host: ScreenshotHost = {
    getNodeByIdAsync: async (id) => (id === '1:1' ? node : id === '0:1' ? { id, name: 'Page', type: 'PAGE' } : null),
    base64Encode: (data) => `b64:${data.length}`,
  };
  return { host, exports };
}

const ask = (
  nodeId: string,
  size: { scale: number } | { maxDimension: number },
  maxBytes: number = SCREENSHOT_LIMITS.maxBytes,
) => ({ type: 'export', requestId: 'q1', nodeId, size, maxBytes }) as const;

describe('a screenshot the sandbox renders', () => {
  it('renders the longer side at maxDimension, as a PNG, and sends it as base64', async () => {
    const { host, exports } = file({ width: 1440, height: 1794 });
    expect(await renderScreenshot(host, ask('1:1', { maxDimension: 1568 }))).toEqual({
      type: 'exported',
      requestId: 'q1',
      name: 'Nova / Button',
      width: 1259,
      height: 1568,
      scale: 1568 / 1794,
      png: 'b64:1000',
    });
    expect(exports).toEqual([{ format: 'PNG', constraint: { type: 'SCALE', value: 1568 / 1794 } }]);
  });

  it('enlarges a small node no further than the upscale cap', async () => {
    const { host } = file({ width: 32, height: 32 });
    expect(await renderScreenshot(host, ask('1:1', { maxDimension: 1568 }))).toMatchObject({
      scale: SCREENSHOT_LIMITS.maxUpscale,
      width: 64,
    });
  });

  it('renders at the scale asked for', async () => {
    const { host, exports } = file({ width: 300, height: 200 });
    expect(await renderScreenshot(host, ask('1:1', { scale: 3 }))).toMatchObject({ width: 900, height: 600, scale: 3 });
    expect(exports).toEqual([{ format: 'PNG', constraint: { type: 'SCALE', value: 3 } }]);
  });

  it('refuses a render past the longest side a screenshot may have, without exporting it', async () => {
    const { host, exports } = file({ width: 1440, height: 1794 });
    expect(await renderScreenshot(host, ask('1:1', { scale: 4 }))).toEqual({
      type: 'export-refused',
      requestId: 'q1',
      reason: 'too-large',
      width: 5760,
      height: 7176,
    });
    expect(exports).toEqual([]);
  });

  it('refuses a PNG over the bytes the server takes, and sends none of it', async () => {
    const { host } = file({ width: 1440, height: 1794 }, 5000);
    expect(await renderScreenshot(host, ask('1:1', { maxDimension: 1568 }, 4000))).toEqual({
      type: 'export-refused',
      requestId: 'q1',
      reason: 'too-large',
      bytes: 5000,
      width: 1259,
      height: 1568,
    });
  });

  it('refuses a node the file lacks, a page, and a node Figma cannot render', async () => {
    expect(await renderScreenshot(file({ width: 1, height: 1 }).host, ask('9:9', { scale: 1 }))).toMatchObject({
      reason: 'missing',
    });
    expect(await renderScreenshot(file({ width: 1, height: 1 }).host, ask('0:1', { scale: 1 }))).toMatchObject({
      reason: 'not-exportable',
    });
    expect(await renderScreenshot(file({ width: 10, height: 10 }, 10, true).host, ask('1:1', { scale: 1 }))).toEqual({
      type: 'export-refused',
      requestId: 'q1',
      reason: 'failed',
      error: 'Error: in exportAsync: node has no visible content',
    });
  });
});
