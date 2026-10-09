export type Radii = [number, number, number, number];

/**
 * The radii as drawn: where two adjacent corners together exceed their side, CSS scales every radius by
 * the same factor until they fit (CSS Backgrounds and Borders 3, "Corner Overlap"), and a drawing tool
 * clamps the same way, so a radius token larger than its box draws the pill both sides compare as.
 */
export function fitRadii(radii: Radii, width: number, height: number): Radii {
  const [tl, tr, br, bl] = radii;
  const ratios = [width / (tl + tr), width / (bl + br), height / (tl + bl), height / (tr + br)].filter(Number.isFinite);
  const factor = Math.min(1, ...ratios);
  return [tl * factor, tr * factor, br * factor, bl * factor];
}
