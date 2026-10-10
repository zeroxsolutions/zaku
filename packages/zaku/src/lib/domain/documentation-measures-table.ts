import { DOCUMENTATION_PARTS, type DocumentationLayout, type DocumentationPart } from './documentation-measures.js';

/** The comment lines that hold building-the-library's printed copy of the table in its Figma reference. */
export const MEASURES_BLOCK_START = '<!-- documentation-measures: generated from zaku, edit the table there -->';
export const MEASURES_BLOCK_END = '<!-- /documentation-measures -->';

const code = (text: string): string => `\`${text}\``;

function layoutText(layout: DocumentationLayout): string {
  const parts = [layout.mode.toLowerCase()];
  if (layout.wrap) parts.push('wrap');
  if (layout.padding.some((side) => side !== 0)) parts.push(`padding ${layout.padding.join(' ')}`);
  parts.push(`gap ${layout.gap}`);
  if (layout.crossGap !== undefined) parts.push(`row gap ${layout.crossGap}`);
  if (layout.align) parts.push(`align ${layout.align.join(' ').toLowerCase()}`);
  return parts.join(', ');
}

function sizeText(part: DocumentationPart): string {
  const parts: string[] = [];
  if (part.at) parts.push(`at ${part.at.x}, ${part.at.y}`);
  if (part.width !== undefined || part.height !== undefined)
    parts.push(`${part.width ?? 'any'} x ${part.height ?? 'any'}`);
  const sizing = [part.sizing?.horizontal, part.sizing?.vertical];
  if (sizing.some(Boolean)) parts.push(`sizing ${sizing.map((s) => (s ?? 'any').toLowerCase()).join(' / ')}`);
  return parts.join('; ');
}

function contentText(part: DocumentationPart): string {
  const parts: string[] = [];
  if (part.main) parts.push(`instance of ${code(part.main)}`);
  if (part.font) parts.push(`${part.font.weight} ${part.font.size} / ${part.font.lineHeight}`);
  // U+2022 prints as its code point, so the reference stays plain ASCII.
  if (part.text !== undefined) parts.push(part.text === '\u2022' ? 'reads U+2022' : `reads ${code(part.text)}`);
  if (part.properties)
    parts.push(part.properties.map((p) => `${code(p.name)} ${p.type} (${code(String(p.default))})`).join(', '));
  if (part.paint) parts.push(part.paint);
  return parts.join('; ');
}

/** The table as building-the-library's Figma reference prints it, between its two comment lines. */
export function documentationMeasuresBlock(): string {
  const head = ['Part', 'Type', 'Layout', 'Place, size, sizing', 'Text, properties, paint'];
  const body = DOCUMENTATION_PARTS.map((part) => {
    const layouts = part.layout === undefined ? [] : Array.isArray(part.layout) ? part.layout : [part.layout];
    const where = part.where === 'view' ? 'view ' : '';
    return [
      `${where}${part.path.map((name) => (name === '*' ? '*' : code(name))).join(' / ')}`,
      part.type,
      (layouts as DocumentationLayout[]).map(layoutText).join(', or '),
      sizeText(part),
      contentText(part),
    ];
  });
  // Padded as the repository's formatter pads a Markdown table, so formatting the reference leaves it equal.
  const widths = head.map((_, column) => Math.max(3, ...[head, ...body].map((cells) => cells[column]?.length ?? 0)));
  const row = (cells: string[]): string =>
    `| ${cells.map((cell, column) => cell.padEnd(widths[column] ?? 0)).join(' | ')} |`;
  return [
    MEASURES_BLOCK_START,
    '',
    row(head),
    row(widths.map((width) => '-'.repeat(width))),
    ...body.map(row),
    '',
    MEASURES_BLOCK_END,
  ].join('\n');
}
