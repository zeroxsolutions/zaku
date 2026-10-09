import { contrastRatio, deltaEOk, parseCssColour, toHex } from './colour.js';

describe('parseCssColour', () => {
  it('converts an oklch value to sRGB the way the stylesheet resolves it', () => {
    const emerald = parseCssColour('oklch(0.508 0.118 165.612)');
    expect(emerald && toHex(emerald)).toBe('#007a55');
    expect(emerald?.r).toBeCloseTo(0, 3);
    expect(emerald?.g).toBeCloseTo(0.4782, 3);
    expect(emerald?.b).toBeCloseTo(0.3335, 3);
  });

  it('reads an alpha written as a percentage or a fraction', () => {
    expect(parseCssColour('oklch(1 0 0 / 10%)')).toEqual({ r: 1, g: 1, b: 1, a: 0.1 });
    expect(parseCssColour('oklch(1 0 0 / 0.15)')?.a).toBe(0.15);
  });

  it('reads hex and returns null for anything else', () => {
    expect(parseCssColour('#09090b')).toEqual({ r: 0.0353, g: 0.0353, b: 0.0431, a: 1 });
    expect(parseCssColour('0.625rem')).toBeNull();
  });
});

describe('parseCssColour, on what a browser computes', () => {
  it('reads rgb() and rgba() in comma and space syntax', () => {
    expect(parseCssColour('rgb(0, 122, 85)')).toEqual({ r: 0, g: 0.4784, b: 0.3333, a: 1 });
    expect(parseCssColour('rgba(255, 255, 255, 0.1)')).toEqual({ r: 1, g: 1, b: 1, a: 0.1 });
    expect(parseCssColour('rgb(255 255 255 / 50%)')?.a).toBe(0.5);
  });

  it('reads color(srgb) and oklab()', () => {
    expect(parseCssColour('color(srgb 1 0.5 0 / 0.25)')).toEqual({ r: 1, g: 0.5, b: 0, a: 0.25 });
    const emerald = parseCssColour('oklab(0.508 -0.1143 0.0293)');
    expect(emerald && toHex(emerald)).toBe('#007a55');
  });

  it('reads transparent and an oklch with a none hue', () => {
    expect(parseCssColour('transparent')).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    expect(parseCssColour('oklch(1 0 none)')).toEqual({ r: 1, g: 1, b: 1, a: 1 });
  });
});

describe('deltaEOk', () => {
  it('is 0 for the same colour and over 1 for a visibly different one', () => {
    const a = { r: 0, g: 0.4784, b: 0.3333, a: 1 };
    expect(deltaEOk(a, a)).toBe(0);
    expect(deltaEOk(a, { r: 0.2627, g: 0.1765, b: 0.8431, a: 1 })).toBeGreaterThan(1);
  });
});

describe('contrastRatio', () => {
  it('is 21 for black on white, and composites a translucent foreground first', () => {
    const white = { r: 1, g: 1, b: 1, a: 1 };
    expect(contrastRatio({ r: 0, g: 0, b: 0, a: 1 }, white)).toBeCloseTo(21, 1);
    expect(contrastRatio({ r: 0, g: 0, b: 0, a: 0 }, white)).toBeCloseTo(1, 5);
  });
});
