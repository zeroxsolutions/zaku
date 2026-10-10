import { SCREENSHOT_LIMITS } from '../../schema/bridge.js';

/**
 * The render of a node would pass what a screenshot may carry: its PNG's bytes, or its pixels' longer side.
 * `width` and `height` are the render's size in pixels; `bytes` is absent when it was refused before encoding.
 */
export class ScreenshotTooLarge extends Error {
  constructor(nodeId: string, width: number, height: number, bytes?: number) {
    const longer = Math.max(width, height);
    // Bytes grow with the area, so the side that fits shrinks by the square root of the excess.
    const fits = Math.floor(
      Math.min(
        SCREENSHOT_LIMITS.maxDimension,
        bytes === undefined
          ? SCREENSHOT_LIMITS.maxDimension
          : longer * Math.sqrt(SCREENSHOT_LIMITS.maxBytes / bytes) * 0.9,
      ),
    );
    const what =
      bytes === undefined
        ? `${nodeId} would render ${width} x ${height} px, past the ${SCREENSHOT_LIMITS.maxDimension} px a side may be`
        : `${nodeId} renders to ${bytes} bytes of PNG at ${width} x ${height} px, over the ${SCREENSHOT_LIMITS.maxBytes} a screenshot may carry`;
    super(
      `ScreenshotTooLarge: ${what}. Nothing was sent. Call get_screenshot again with maxDimension ${Math.max(SCREENSHOT_LIMITS.minDimension, fits)}, or with the id of one of its children, which read lists.`,
    );
    this.name = 'ScreenshotTooLarge';
  }
}
