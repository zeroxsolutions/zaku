/**
 * Calls a script may not make: they close the plugin, talk to the person, load every page of a
 * dynamic-page file, or move the person's view. A guard against a mistake, not a sandbox: a script
 * that spells the call another way gets through.
 */
const REFUSED: readonly { call: string; pattern: RegExp }[] = [
  { call: 'figma.closePlugin', pattern: /\bfigma\s*\.\s*closePlugin\b/ },
  { call: 'figma.notify', pattern: /\bfigma\s*\.\s*notify\b/ },
  { call: 'figma.loadAllPagesAsync', pattern: /\bfigma\s*\.\s*loadAllPagesAsync\b/ },
  { call: 'setting figma.currentPage', pattern: /\bfigma\s*\.\s*currentPage\s*=(?!=)/ },
];

export function refusedCalls(script: string): string[] {
  return REFUSED.filter(({ pattern }) => pattern.test(script)).map(({ call }) => call);
}
