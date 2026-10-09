import type { LibraryComponent, LibraryItem, LibraryVariant, Rgba } from '../library.js';
import type { RecipePart } from '../recipe.js';
import { fitRadii } from '../corner-radii.js';
import { deltaEOk, toHex } from '../colour.js';
import type { Check, Finding } from '../findings.js';

function propsLabel(props: Record<string, string>): string {
  return Object.entries(props)
    .map(([key, value]) => `${key}=${value}`)
    .join(', ');
}

/** A library variant's properties renamed to the code's props through the component's map. */
function codeProps(component: LibraryComponent, variant: LibraryVariant): Record<string, string> {
  const map = component.map?.props ?? {};
  return Object.fromEntries(
    Object.entries(variant.props).flatMap(([property, value]) => {
      const prop = map[property];
      return prop === undefined ? [] : [[prop, value.toLowerCase()]];
    }),
  );
}

function sameProps(a: Record<string, string>, b: Record<string, string>): boolean {
  return (
    Object.keys(a).length === Object.keys(b).length &&
    Object.entries(a).every(([key, value]) => b[key]?.toLowerCase() === value)
  );
}

const GENERIC = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'math', 'emoji', 'fangsong']);

/** The named families of a font stack, in order, without the generic keyword that ends it. */
function families(stack: string): string[] {
  return stack
    .split(',')
    .map((family) => family.trim().replace(/^["']|["']$/g, ''))
    .filter((family) => family !== '' && !GENERIC.has(family.toLowerCase()));
}

interface Compare {
  label: string;
  item: LibraryItem;
  scheme: string;
  findings: Finding[];
  /** The library draws its text in a face the code falls back to, not the one the browser rendered. */
  fallback: boolean;
}

function colour(at: Compare, field: string, library: Rgba | null, code: Rgba | null): void {
  const transparent = { r: 0, g: 0, b: 0, a: 0 };
  const drawn = library ?? transparent;
  const coded = code ?? transparent;
  if (drawn.a === 0 && coded.a === 0) return;
  if (deltaEOk(drawn, coded) > 1) {
    at.findings.push({
      check: 'recipe',
      nodeId: at.item.nodeId,
      field,
      message: `${at.label}: ${field} is ${toHex(drawn)} in the library and ${toHex(coded)} in code (${at.scheme})`,
    });
  }
}

function size(at: Compare, field: string, library: number | null, code: number | null | undefined): void {
  if (library === null || code === null || code === undefined) return;
  if (Math.abs(library - code) > 0.5) {
    at.findings.push({
      check: 'recipe',
      nodeId: at.item.nodeId,
      field,
      message: `${at.label}: ${field} is ${library} in the library and ${code} in code`,
    });
  }
}

function comparePart(at: Compare, part: RecipePart): void {
  const { item } = at;
  colour(at, 'background', item.fill, part.background);
  if (item.type.toUpperCase() === 'TEXT') colour(at, 'color', item.textColor, part.color);
  colour(at, 'borderColor', item.stroke, part.borderColor);
  // An icon draws in the colour its part computes to, since the code's glyph strokes in currentColor.
  if (item.glyph) colour(at, 'glyph', item.glyph, part.color);
  if (item.path === '') {
    // Another face sets the label's advance, so a width the text sizes cannot match to the pixel.
    if (!at.fallback) size(at, 'width', item.width, part.width);
    size(at, 'height', item.height, part.height);
  }
  item.padding?.forEach((value, index) => size(at, `padding[${index}]`, value, part.padding[index]));
  size(at, 'gap', item.gap, part.gap);
  // Figma stores a radius token as set and clamps it only when drawing, so fit it to the box as the code side is.
  const drawnRadii = item.radii ? fitRadii(item.radii, item.width, item.height) : null;
  drawnRadii?.forEach((value, index) => size(at, `radii[${index}]`, value, part.radii?.[index]));
  item.strokeWeights?.forEach((value, index) => size(at, `borderWidths[${index}]`, value, part.borderWidths[index]));
  if (!item.strokeWeights && part.borderWidths.some((width) => width > 0)) {
    part.borderWidths.forEach((width, index) => size(at, `borderWidths[${index}]`, 0, width));
  }
  size(at, 'fontSize', item.fontSize, part.fontSize);
  // A stack that opens on a system face a drawing tool cannot lay out is drawn in a family it falls back to.
  const drawn = item.fontFamily ? families(item.fontFamily)[0] : undefined;
  const coded = part.fontFamily ? families(part.fontFamily) : [];
  if (drawn && coded.length > 0 && !coded.some((family) => family.toLowerCase() === drawn.toLowerCase())) {
    at.findings.push({
      check: 'font',
      nodeId: item.nodeId,
      field: 'fontFamily',
      message: `${at.label}: font family is ${drawn} in the library and ${coded.join(', ')} in code`,
    });
  }
}

export const recipe: Check = ({ config, library, recipe: doc }) => {
  if (!doc || !library) return { notRun: 'recipe.json or library.json is missing' };
  const findings: Finding[] = [];
  for (const code of doc.components) {
    const component = library.components.find((candidate) => candidate.name === code.name);
    if (!component) {
      findings.push({
        check: 'library',
        message: `${code.name} has a code recipe and no library component`,
      });
      continue;
    }
    if (!component.map) {
      findings.push({
        check: 'library',
        message: `${component.name} has no props and parts map in its description`,
      });
      continue;
    }
    const layerOf = new Map(Object.entries(component.map.parts).map(([layer, name]) => [name, layer]));
    layerOf.set('root', '');
    for (const codeVariant of code.variants) {
      const label = `${component.name} ${propsLabel(codeVariant.props)}`;
      const variant = component.variants.find((candidate) =>
        sameProps(codeProps(component, candidate), codeVariant.props),
      );
      if (!variant) {
        findings.push({
          check: 'library',
          message: `${label} (${codeVariant.scheme}) has no library variant`,
        });
        continue;
      }
      const combo: Record<string, string> = {
        ...config.modes,
        semantic: codeVariant.scheme === 'light' ? 'Light' : 'Dark',
      };
      const mode = variant.modes.find((candidate) =>
        Object.entries(combo).every(([key, value]) => candidate.combo[key] === value),
      );
      if (!mode) {
        findings.push({
          check: 'recipe',
          message: `${label}: the snapshot has no values for ${propsLabel(combo)}`,
        });
        continue;
      }
      const itemOf = (partName: string): LibraryItem | undefined => {
        const layer = layerOf.get(partName);
        return layer === undefined ? undefined : mode.items.find((candidate) => candidate.path === layer);
      };
      const fallback = Object.entries(codeVariant.parts).some(([partName, part]) => {
        const drawn = itemOf(partName)?.fontFamily;
        const coded = part.fontFamily ? families(part.fontFamily) : [];
        return Boolean(drawn && coded.length > 0 && coded[0]?.toLowerCase() !== families(drawn)[0]?.toLowerCase());
      });
      for (const [partName, part] of Object.entries(codeVariant.parts)) {
        const layer = layerOf.get(partName);
        const item = layer === undefined ? undefined : mode.items.find((candidate) => candidate.path === layer);
        if (!item) {
          findings.push({
            check: 'recipe',
            message: `${label}: part ${partName} has no layer in the library variant`,
          });
          continue;
        }
        comparePart({ label: `${label} ${partName}`, item, scheme: codeVariant.scheme, findings, fallback }, part);
      }
    }
    const covered = code.variants
      .filter((candidate) => candidate.scheme === 'light')
      .map((candidate) => candidate.props);
    for (const variant of component.variants) {
      const props = codeProps(component, variant);
      if (!covered.some((candidate) => sameProps(props, candidate))) {
        findings.push({
          check: 'library',
          message: `${component.name} ${propsLabel(props)} is a library variant the code does not have`,
        });
      }
    }
  }
  return { findings };
};
