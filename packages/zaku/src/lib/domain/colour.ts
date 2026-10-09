import type { Rgba } from './library.js';

const round = (value: number): number => Math.round(value * 10000) / 10000;
const clamp = (value: number): number => Math.min(1, Math.max(0, value));
const encode = (value: number): number => (value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055);
const decode = (value: number): number => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);

/** CSS Color 4's OKLab to sRGB, clipped to the gamut the way a browser paints it. */
export function oklabToRgba(l: number, a: number, b: number, alpha: number): Rgba {
  const l1 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m1 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s1 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const channel = (value: number): number => round(clamp(encode(value)));
  return {
    r: channel(4.0767416621 * l1 - 3.3077115913 * m1 + 0.2309699292 * s1),
    g: channel(-1.2684380046 * l1 + 2.6097574011 * m1 - 0.3413193965 * s1),
    b: channel(-0.0041960863 * l1 - 0.7034186147 * m1 + 1.707614701 * s1),
    a: alpha,
  };
}

/** CSS Color 4's OKLCH to sRGB, by way of OKLab. */
export function oklchToRgba(l: number, c: number, h: number, alpha: number): Rgba {
  const rad = (h * Math.PI) / 180;
  return oklabToRgba(l, c * Math.cos(rad), c * Math.sin(rad), alpha);
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNCTION = /^(rgba?|oklch|oklab|color)\(\s*(.*?)\s*\)$/i;

/** A number, a percentage of `whole`, or `none` (0), as CSS Color 4 writes a channel. */
function channelOf(text: string | undefined, whole: number): number | null {
  if (text === undefined) return null;
  if (text === 'none') return 0;
  const value = Number(text.endsWith('%') ? text.slice(0, -1) : text.replace(/deg$/, ''));
  if (!Number.isFinite(value)) return null;
  return text.endsWith('%') ? (value / 100) * whole : value;
}

/** A colour as a stylesheet declares it or a browser computes it, in sRGB; null for anything else. */
export function parseCssColour(value: string): Rgba | null {
  const text = value.trim().toLowerCase();
  if (text === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  const hex = HEX.exec(text)?.[1];
  if (hex) {
    const digits = hex.length === 3 ? [...hex].map((digit) => digit + digit).join('') : hex;
    const channel = (index: number): number => round(parseInt(digits.slice(index, index + 2), 16) / 255);
    return { r: channel(0), g: channel(2), b: channel(4), a: digits.length === 8 ? channel(6) : 1 };
  }
  const call = FUNCTION.exec(text);
  if (!call) return null;
  const [, name = '', body = ''] = call;
  const [main = '', slash] = body.includes('/') ? body.split('/') : [body.replaceAll(',', ' '), undefined];
  const words = main.trim().split(/\s+/);
  const alphaWord = slash?.trim() ?? (name.startsWith('rgb') && words.length === 4 ? words.pop() : undefined);
  const alpha = alphaWord === undefined ? 1 : channelOf(alphaWord, 1);
  if (alpha === null) return null;
  if (name === 'color') {
    if (words[0] !== 'srgb') return null;
    const [r, g, b] = words.slice(1).map((word) => channelOf(word, 1));
    if (r == null || g == null || b == null) return null;
    return { r: round(clamp(r)), g: round(clamp(g)), b: round(clamp(b)), a: round(alpha) };
  }
  if (words.length !== 3) return null;
  if (name.startsWith('rgb')) {
    const [r, g, b] = words.map((word) => channelOf(word, 255));
    if (r == null || g == null || b == null) return null;
    return {
      r: round(clamp(r / 255)),
      g: round(clamp(g / 255)),
      b: round(clamp(b / 255)),
      a: round(alpha),
    };
  }
  const [l, x, y] = [
    channelOf(words[0], 1),
    channelOf(words[1], 0.4),
    channelOf(words[2], name === 'oklch' ? 360 : 0.4),
  ];
  if (l == null || x == null || y == null) return null;
  return name === 'oklch' ? oklchToRgba(l, x, y, round(alpha)) : oklabToRgba(l, x, y, round(alpha));
}

export function rgbaToOklab(colour: Rgba): [number, number, number] {
  const [r, g, b] = [decode(colour.r), decode(colour.g), decode(colour.b)];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** Euclidean distance in OKLab, scaled so 1 is the threshold of a visible difference. */
export function deltaEOk(a: Rgba, b: Rgba): number {
  const [l1, a1, b1] = rgbaToOklab(a);
  const [l2, a2, b2] = rgbaToOklab(b);
  return Math.round(Math.hypot(l1 - l2, a1 - a2, b1 - b2, a.a - b.a) * 100 * 1000) / 1000;
}

export function toHex(colour: Rgba): string {
  const channels = [colour.r, colour.g, colour.b].map((value) =>
    Math.round(clamp(value) * 255)
      .toString(16)
      .padStart(2, '0'),
  );
  return `#${channels.join('')}`;
}

function luminance(colour: Rgba): number {
  return 0.2126 * decode(colour.r) + 0.7152 * decode(colour.g) + 0.0722 * decode(colour.b);
}

/** WCAG 2.2 contrast ratio, with the foreground composited over the background first. */
export function contrastRatio(fg: Rgba, bg: Rgba): number {
  const over = (front: number, back: number): number => front * fg.a + back * (1 - fg.a);
  const composite = { r: over(fg.r, bg.r), g: over(fg.g, bg.g), b: over(fg.b, bg.b), a: 1 };
  const [one, two] = [luminance(composite), luminance(bg)];
  return (Math.max(one, two) + 0.05) / (Math.min(one, two) + 0.05);
}
