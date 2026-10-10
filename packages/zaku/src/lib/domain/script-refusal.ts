/**
 * Calls a script may not make: they close the plugin, talk to the person, load every page of a
 * dynamic-page file, move the person's view, or assign a property a dynamic-page file only takes
 * through its async setter; or they build code from a string at run time, which
 * this check cannot read, so every other refusal would stop at the string. A guard against a mistake,
 * not a sandbox: a script that spells the call another way gets through.
 */
const REFUSED: readonly { call: string; pattern: RegExp }[] = [
  { call: 'figma.closePlugin', pattern: /\bfigma\s*\.\s*closePlugin\b/ },
  { call: 'figma.notify', pattern: /\bfigma\s*\.\s*notify\b/ },
  { call: 'figma.loadAllPagesAsync', pattern: /\bfigma\s*\.\s*loadAllPagesAsync\b/ },
  { call: 'setting figma.currentPage', pattern: /\bfigma\s*\.\s*currentPage\s*=(?!=)/ },
  ...['textStyleId', 'fillStyleId', 'strokeStyleId', 'effectStyleId', 'gridStyleId', 'vectorNetwork', 'reactions'].map(
    (property) => ({
      // The plugin reads a file page by page (documentAccess dynamic-page), and Figma's API makes these read-only then.
      call: `setting ${property} (use set${property[0].toUpperCase()}${property.slice(1)}Async)`,
      pattern: new RegExp(`\\.\\s*${property}\\s*=(?!=)`),
    }),
  ),
  { call: 'new Function', pattern: /\bnew\s+Function\s*\(/ },
  { call: 'Function()', pattern: /(?<![\w$.])(?<!\bnew\s+)Function\s*\(/ },
  { call: 'eval()', pattern: /(?<![\w$.])eval\s*\(/ },
  { call: 'the Function constructor', pattern: /\.\s*constructor\b/ },
];

/** The refusals that stop code built at run time; their message says what to do instead. */
export const DYNAMIC_CODE_CALLS: ReadonlySet<string> = new Set([
  'new Function',
  'Function()',
  'eval()',
  'the Function constructor',
]);

export function refusedCalls(script: string): string[] {
  return REFUSED.filter(({ pattern }) => pattern.test(script)).map(({ call }) => call);
}
