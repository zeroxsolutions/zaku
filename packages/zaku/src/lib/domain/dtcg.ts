import { dirname, join, resolve } from 'node:path';
import type { DtcgSystem } from '../schema/zaku-config.js';
import type { Rgba } from './library.js';
import { oklchToRgba, parseCssColour, toHex } from './colour.js';
import { tokenDocumentSchema, type TokenDocument, type TokenSet } from './token-document.js';

/** Reads and parses one JSON file; a spec replaces it. */
export type ReadJson = (path: string) => Promise<unknown>;

/** A token after aliases are followed: its type, its value, and what the file wrote for it. */
export interface FlatToken {
  type: string;
  value: unknown;
  source: string;
}

type Tree = Record<string, unknown>;

const isTree = (value: unknown): value is Tree => typeof value === 'object' && value !== null && !Array.isArray(value);
const ALIAS = /^\{([^{}]+)\}$/;

function merge(into: Tree, from: Tree): Tree {
  for (const [key, value] of Object.entries(from)) {
    const current = into[key];
    // A token replaces a token whole; groups merge, so a theme file overrides one role and keeps the rest.
    into[key] = isTree(current) && isTree(value) && !('$value' in value) ? merge({ ...current }, value) : value;
  }
  return into;
}

/** Every token in a DTCG tree by its dot path, its `$type` taken from the nearest group, aliases followed. */
export function flattenTokens(tree: Tree): Map<string, FlatToken> {
  const raw = new Map<string, { type: string | undefined; value: unknown }>();
  const walk = (node: Tree, path: string[], type: string | undefined): void => {
    const own = typeof node['$type'] === 'string' ? node['$type'] : type;
    if ('$value' in node) {
      raw.set(path.join('.'), { type: own, value: node['$value'] });
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (!key.startsWith('$') && isTree(child)) walk(child, [...path, key], own);
    }
  };
  walk(tree, [], undefined);

  const resolveToken = (path: string, seen: string[]): { type: string | undefined; value: unknown } => {
    const token = raw.get(path);
    if (!token) throw new Error(`${seen.at(-1)} refers to ${path}, which no token is`);
    const alias = typeof token.value === 'string' ? ALIAS.exec(token.value)?.[1] : undefined;
    if (alias === undefined) return token;
    if (seen.includes(alias)) throw new Error(`${seen[0]} is an alias cycle`);
    const target = resolveToken(alias, [...seen, path]);
    return { type: token.type ?? target.type, value: target.value };
  };

  const flat = new Map<string, FlatToken>();
  for (const [path, token] of raw) {
    const resolved = resolveToken(path, [path]);
    if (resolved.type === undefined) continue;
    flat.set(path, {
      type: resolved.type,
      value: resolved.value,
      source: typeof token.value === 'string' ? token.value : JSON.stringify(token.value),
    });
  }
  return flat;
}

interface Resolver {
  sets?: Record<string, { sources?: unknown[] }>;
  modifiers?: Record<string, { contexts?: Record<string, unknown[]>; default?: string }>;
  resolutionOrder?: unknown[];
}

async function sourcesTree(
  sources: readonly unknown[],
  dir: string,
  read: ReadJson,
  resolver: Resolver,
  inputs: Record<string, string>,
): Promise<Tree> {
  const tree: Tree = {};
  for (const source of sources) {
    if (!isTree(source)) continue;
    const ref = source['$ref'];
    if (typeof ref !== 'string') {
      merge(tree, source);
      continue;
    }
    const set = /^#\/sets\/(.+)$/.exec(ref)?.[1];
    const modifier = /^#\/modifiers\/(.+)$/.exec(ref)?.[1];
    if (set !== undefined) {
      const found = resolver.sets?.[set];
      if (!found) throw new Error(`the resolver has no set ${set}`);
      merge(tree, await sourcesTree(found.sources ?? [], dir, read, resolver, inputs));
    } else if (modifier !== undefined) {
      const found = resolver.modifiers?.[modifier];
      if (!found) throw new Error(`the resolver has no modifier ${modifier}`);
      const context = inputs[modifier] ?? found.default;
      const chosen = context === undefined ? undefined : found.contexts?.[context];
      if (!chosen) throw new Error(`modifier ${modifier} has no context ${String(context)}`);
      merge(tree, await sourcesTree(chosen, dir, read, resolver, inputs));
    } else {
      const file = await read(resolve(dir, ref));
      if (!isTree(file)) throw new Error(`${ref} is not a DTCG token file`);
      merge(tree, file);
    }
  }
  return tree;
}

/** The tokens each scheme resolves to: a resolver run with that scheme's contexts, or its files merged in order. */
export async function loadDtcgSchemes(
  system: DtcgSystem,
  read: ReadJson,
  repoRoot: string,
): Promise<{ light: Map<string, FlatToken>; dark: Map<string, FlatToken> }> {
  const scheme = async (input: DtcgSystem['light']): Promise<Map<string, FlatToken>> => {
    if (system.resolver === undefined) {
      const files = Array.isArray(input) ? input : [];
      return flattenTokens(
        await sourcesTree(
          files.map(($ref) => ({ $ref })),
          repoRoot,
          read,
          {},
          {},
        ),
      );
    }
    const path = join(repoRoot, system.resolver);
    const resolver = (await read(path)) as Resolver;
    const inputs = Array.isArray(input) ? {} : input;
    return flattenTokens(await sourcesTree(resolver.resolutionOrder ?? [], dirname(path), read, resolver, inputs));
  };
  return { light: await scheme(system.light), dark: await scheme(system.dark) };
}

function colourOf(path: string, value: unknown): Rgba {
  if (typeof value === 'string') {
    const parsed = parseCssColour(value);
    if (!parsed) throw new Error(`${path} is ${value}; zaku reads srgb, oklch or a hex`);
    return parsed;
  }
  if (isTree(value)) {
    const components = Array.isArray(value['components']) ? (value['components'] as unknown[]).map(Number) : [];
    const alpha = typeof value['alpha'] === 'number' ? value['alpha'] : 1;
    const [a = 0, b = 0, c = 0] = components;
    if (value['colorSpace'] === 'srgb' && components.length === 3) return { r: a, g: b, b: c, a: alpha };
    if (value['colorSpace'] === 'oklch' && components.length === 3) return oklchToRgba(a, b, c, alpha);
    const hex = typeof value['hex'] === 'string' ? parseCssColour(value['hex']) : null;
    if (hex) return { ...hex, a: alpha };
    throw new Error(`${path} is in ${String(value['colorSpace'])}; zaku reads srgb, oklch or a hex`);
  }
  throw new Error(`${path} is not a colour`);
}

function pixelsOf(path: string, value: unknown): number {
  let amount = NaN;
  let unit = '';
  if (isTree(value)) {
    amount = Number(value['value']);
    unit = String(value['unit']);
  } else if (typeof value === 'string') {
    const match = /^([\d.]+)(px|rem)$/.exec(value.trim());
    amount = Number(match?.[1]);
    unit = match?.[2] ?? '';
  }
  if (!Number.isFinite(amount) || (unit !== 'px' && unit !== 'rem'))
    throw new Error(`${path} is not a dimension in px or rem`);
  // DTCG leaves the root size to the platform; a browser's default root is 16 px.
  return unit === 'rem' ? amount * 16 : amount;
}

const round = (value: number): number => Math.round(value * 10000) / 10000;

/** The tokens.json zaku checks against: the colour roles and radius steps of each scheme, in sRGB and px. */
export function dtcgTokenDocument(
  system: DtcgSystem,
  schemes: { light: Map<string, FlatToken>; dark: Map<string, FlatToken> },
  name: string,
): TokenDocument {
  const extensions = (source: string): { 'com.zeroxsolutions.zaku': { axis: 'system'; source: string } } => ({
    'com.zeroxsolutions.zaku': { axis: 'system' as const, source },
  });
  const set = (flat: Map<string, FlatToken>): TokenSet => {
    const color: TokenSet['color'] = {};
    const radius: TokenSet['radius'] = {};
    for (const [path, token] of flat) {
      const colours = `${system.colors}.`;
      const radii = `${system.radii}.`;
      if (token.type === 'color' && path.startsWith(colours)) {
        const value = colourOf(path, token.value);
        const rgba = { r: round(value.r), g: round(value.g), b: round(value.b), a: round(value.a) };
        color[path.slice(colours.length).replaceAll('.', '/')] = {
          $type: 'color',
          $value: {
            colorSpace: 'srgb',
            components: [rgba.r, rgba.g, rgba.b],
            alpha: rgba.a,
            hex: toHex(rgba),
          },
          $extensions: extensions(token.source),
        };
      } else if (token.type === 'dimension' && path.startsWith(radii)) {
        radius[path.slice(radii.length).replaceAll('.', '/')] = {
          $type: 'dimension',
          $value: { value: round(pixelsOf(path, token.value)), unit: 'px' },
          $extensions: extensions(token.source),
        };
      }
    }
    return { color, radius };
  };
  const named = (input: DtcgSystem['light'], scheme: string): string =>
    Array.isArray(input)
      ? `${input.join(', ')} (${scheme})`
      : `${Object.entries(input)
          .map(([key, value]) => `${key}=${value}`)
          .join(', ')} (${scheme})`;
  const from = system.resolver === undefined ? '' : `${system.resolver}, `;
  return tokenDocumentSchema.parse({
    $schema: 'https://www.designtokens.org/schemas/2025.10/resolver.json',
    version: '2025.10',
    name,
    description: `DTCG tokens: ${from}${named(system.light, 'light')}; ${named(system.dark, 'dark')}`,
    modifiers: {
      scheme: {
        contexts: { light: [set(schemes.light)], dark: [set(schemes.dark)] },
        default: 'light',
      },
    },
    resolutionOrder: [{ $ref: '#/modifiers/scheme' }],
  });
}
