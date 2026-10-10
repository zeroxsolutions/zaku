import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { UnpairDialog } from './unpair-dialog';

/** The colour a stack of CSS colours paints, bottom first, as the browser composites them. */
function painted(...layers: string[]): [number, number, number] {
  const context = document.createElement('canvas').getContext('2d');
  if (!context) throw new Error('no 2d canvas');
  for (const layer of layers) {
    context.fillStyle = layer;
    context.fillRect(0, 0, 1, 1);
  }
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

/** WCAG 2.2's contrast ratio between two sRGB colours. */
function contrast(a: [number, number, number], b: [number, number, number]): number {
  const luminance = (rgb: [number, number, number]): number => {
    const [r, g, b] = rgb.map((v) => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

describe('UnpairDialog', () => {
  afterEach(() => document.documentElement.classList.remove('figma-dark'));

  it.each(['light', 'dark'])('reads its Unpair label at 4.5:1 or more on the fill behind it, in %s', async (theme) => {
    document.documentElement.classList.toggle('figma-dark', theme === 'dark');
    await render(<UnpairDialog onUnpair={() => undefined} />);
    await page.getByRole('button', { name: 'Unpair' }).click();
    const dialog = page.getByRole('alertdialog').element();
    const action = page.getByRole('alertdialog').getByRole('button', { name: 'Unpair' }).element();
    const surface = getComputedStyle(dialog).backgroundColor;
    const fill = painted(surface, getComputedStyle(action).backgroundColor);
    const label = painted(surface, getComputedStyle(action).backgroundColor, getComputedStyle(action).color);
    expect(contrast(label, fill)).toBeGreaterThanOrEqual(4.5);
  });
});
