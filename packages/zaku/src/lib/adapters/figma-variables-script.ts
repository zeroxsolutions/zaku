import type { VariablePart } from '../domain/library.js';

export interface ExportOptions {
  /** The non-semantic modes to resolve under, one entry per product. Each is resolved in Light and Dark. */
  combos: Record<string, string>[];
}

// The Plugin API runs inside Figma and has no typings in this package.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- a structural Plugin API reference
export type FigmaPluginApi = any;

/**
 * Runs inside Figma through use_figma. It is serialized with toString, so it reaches nothing but its
 * arguments: no import, no helper outside its own body.
 */
export async function exportVariables(figma: FigmaPluginApi, options: ExportOptions): Promise<VariablePart> {
  const collections: FigmaPluginApi[] = await figma.variables.getLocalVariableCollectionsAsync();
  const semantic = collections.find((collection) => collection.name === 'semantic');
  if (!semantic) throw new Error('the library has no semantic variable collection');
  const hex = (value: number): string =>
    Math.round(Math.min(1, Math.max(0, value)) * 255)
      .toString(16)
      .padStart(2, '0');
  const variables: Record<string, string> = {};
  for (const collection of collections) {
    for (const id of collection.variableIds) {
      const variable = await figma.variables.getVariableByIdAsync(id);
      // The id's fixed prefix is dropped to keep the reply under the tool's size cap; the reader adds it back.
      if (variable) variables[String(id).replace(/^VariableID:/, '')] = variable.name;
    }
  }
  const holder = figma.createFrame();
  holder.name = 'zaku export';
  holder.x = -100000;
  holder.y = -100000;
  try {
    const tokens: VariablePart['tokens'] = [];
    for (const combo of options.combos.flatMap((base) =>
      ['Light', 'Dark'].map((scheme) => ({ ...base, semantic: scheme })),
    )) {
      for (const [name, mode] of Object.entries(combo)) {
        const collection = collections.find((candidate) => candidate.name === name);
        if (!collection) throw new Error(`no variable collection ${name}`);
        const found = collection.modes.find((candidate: { name: string }) => candidate.name === mode);
        if (!found) throw new Error(`no mode ${mode} in ${name}`);
        holder.setExplicitVariableModeForCollection(collection, found.modeId);
      }
      const values: Record<string, string | number | boolean> = {};
      for (const id of semantic.variableIds) {
        const variable = await figma.variables.getVariableByIdAsync(id);
        const resolved = variable.resolveForConsumer(holder).value;
        values[variable.name] =
          typeof resolved === 'object' && resolved !== null
            ? `#${hex(resolved.r)}${hex(resolved.g)}${hex(resolved.b)}${hex(resolved.a ?? 1)}`
            : resolved;
      }
      tokens.push({ combo, values });
    }
    const textStyles = (await figma.getLocalTextStylesAsync()).map((style: FigmaPluginApi) => ({
      key: style.key,
      name: style.name,
      fontFamily: style.fontName.family,
      fontStyle: style.fontName.style,
      fontSize: style.fontSize,
    }));
    return { exportedAt: new Date().toISOString(), variables, textStyles, tokens };
  } finally {
    holder.remove();
  }
}

/** The code an agent passes to use_figma: the export function and its options, run once. */
export function libraryExportScript(options: ExportOptions): string {
  return `return await (${exportVariables.toString()})(figma, ${JSON.stringify(options)});`;
}
