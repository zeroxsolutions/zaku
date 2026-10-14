import type { VariablePart } from './library.js';

/**
 * One variables export with the components of every page export joined to it, each once: a library in the
 * product file is listed one page per use_figma call, and the variables are the same in every one.
 */
export function mergeParts(parts: readonly VariablePart[]): VariablePart {
  const [first, ...rest] = parts;
  if (!first) throw new Error('mergeParts needs at least one export');
  if (rest.length === 0) return first;
  const seen = new Set<string>();
  const components = parts
    .flatMap((part) => part.components ?? [])
    .filter((component) => !seen.has(component.id) && seen.add(component.id));
  return { ...first, components };
}
