import { fitRadii, type Radii } from './corner-radii.js';
import type { Rgba } from './library.js';
import { parseCssColour } from './colour.js';
import type { RecipeDocument, RecipePart } from './recipe.js';

/** What the recipe page reader returns for one marked part, as the browser computed it. */
export interface RawPart {
  /** Which variant root, in document order, the part belongs to. */
  root: number;
  component: string;
  props: string;
  part: string;
  background: string;
  color: string;
  borderColor: string;
  borderWidths: [number, number, number, number];
  width: number;
  height: number;
  padding: [number, number, number, number];
  gap: string;
  radii: [string, string, string, string];
  fontSize: number;
  fontFamily: string;
}

export type Scheme = 'light' | 'dark';

function propsOf(raw: RawPart): Record<string, string> {
  let props: unknown;
  try {
    props = JSON.parse(raw.props);
  } catch {
    props = undefined;
  }
  const valid =
    typeof props === 'object' &&
    props !== null &&
    !Array.isArray(props) &&
    Object.values(props).every((value) => typeof value === 'string');
  if (!valid) throw new Error(`${raw.component}: data-zaku-props is not a JSON object of strings: ${raw.props}`);
  return props as Record<string, string>;
}

function label(component: string, props: Record<string, string>): string {
  const entries = Object.entries(props).map(([key, value]) => `${key}=${value}`);
  return entries.length === 0 ? component : `${component} ${entries.join(', ')}`;
}

/** One computed corner radius in px: a percentage is of the shorter side, as a drawing tool reads it. */
function cornerPx(value: string, width: number, height: number): number {
  const number = Number.parseFloat(value);
  if (!Number.isFinite(number)) return 0;
  return value.trim().endsWith('%') ? (Math.min(width, height) * number) / 100 : number;
}

/** The code's radii in px, fitted to the box. */
function radiiOf(raw: RawPart): Radii {
  const corners = raw.radii.map((value) => cornerPx(value, raw.width, raw.height)) as Radii;
  return fitRadii(corners, raw.width, raw.height);
}

function partOf(raw: RawPart, at: string): RecipePart {
  const colour = (field: string, value: string): Rgba => {
    const parsed = parseCssColour(value);
    if (!parsed) throw new Error(`${at}, part ${raw.part}: ${field} is ${value}, which zaku does not read`);
    return parsed;
  };
  const background = colour('background', raw.background);
  const gap = Number.parseFloat(raw.gap);
  return {
    background: background.a === 0 ? null : background,
    color: colour('color', raw.color),
    borderColor: raw.borderWidths.some((width) => width > 0) ? colour('borderColor', raw.borderColor) : null,
    borderWidths: raw.borderWidths,
    width: raw.width,
    height: raw.height,
    padding: raw.padding,
    gap: Number.isFinite(gap) ? gap : null,
    radii: radiiOf(raw),
    fontSize: raw.fontSize,
    fontFamily: raw.fontFamily,
  };
}

/** Folds what each scheme's page read into one recipe: a component, its variants, each variant's parts. */
export function buildRecipe(schemes: Record<Scheme, readonly RawPart[]>): RecipeDocument {
  const components = new Map<string, RecipeDocument['components'][number]>();
  for (const scheme of ['light', 'dark'] as const) {
    const variants = new Map<number, RecipeDocument['components'][number]['variants'][number]>();
    const seen = new Map<string, number>();
    for (const raw of schemes[scheme]) {
      const props = propsOf(raw);
      const at = label(raw.component, props);
      let variant = variants.get(raw.root);
      if (!variant) {
        const key = `${raw.component}\n${JSON.stringify(Object.entries(props).sort(([a], [b]) => a.localeCompare(b)))}`;
        if (seen.has(key)) throw new Error(`${at} is rendered twice in ${scheme}`);
        seen.set(key, raw.root);
        variant = { props, scheme, parts: {} };
        variants.set(raw.root, variant);
        const component = components.get(raw.component) ?? { name: raw.component, variants: [] };
        component.variants.push(variant);
        components.set(raw.component, component);
      }
      if (raw.part in variant.parts) throw new Error(`${at} renders part ${raw.part} twice in ${scheme}`);
      variant.parts[raw.part] = partOf(raw, at);
    }
  }
  return { components: [...components.values()] };
}
