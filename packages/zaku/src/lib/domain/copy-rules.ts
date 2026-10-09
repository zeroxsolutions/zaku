import type { CopyConfig } from '../schema/zaku-config.js';
import { COPY_TELLS, type CopyTell } from './copy-tells/index.js';

/** What authored copy may hold, built once per run from `copy` in zaku.yaml and the library's own texts. */
export interface CopyPolicy {
  /** One test per script the locales are written in: Latin for both en and vi. */
  scripts: readonly RegExp[];
  /** Every character the policy allows beyond ASCII and the scripts: currency symbols and library-carried text. */
  extra: ReadonlySet<string>;
  tells: readonly CopyTell[];
}

/** One rule a text breaks: `characters` for a code point, `tone` for a tell. */
export interface CopyIssue {
  field: 'characters' | 'tone';
  message: string;
}

const PRINTABLE_ASCII = /^[\x20-\x7e]$/;
// Figma stores a line break typed with Shift+Enter as U+2028.
const LINE_BREAK = /^[\n\u2028]$/;
const LETTER_OR_MARK = /^[\p{L}\p{M}]$/u;
// A combining mark takes the script of the letter before it.
const INHERITED_MARK = /^(?=\p{M})\p{Script=Inherited}$/u;
const EMOJI = /^\p{Extended_Pictographic}$/u;
const ARROW = /^[\u2190-\u21ff\u27f0-\u27ff\u2900-\u297f\u2b00-\u2b11]$/u;

/** The ASCII each typographic character is written as; the name is the Unicode name, lower case. */
const INSTEAD = new Map<string, { name: string; instead: string }>([
  ['\u2014', { name: 'em dash', instead: 'write "-", or two sentences' }],
  ['\u2013', { name: 'en dash', instead: 'write "-", or two sentences' }],
  ['\u2018', { name: 'left single quotation mark', instead: "write '" }],
  ['\u2019', { name: 'right single quotation mark', instead: "write '" }],
  ['\u201c', { name: 'left double quotation mark', instead: 'write "' }],
  ['\u201d', { name: 'right double quotation mark', instead: 'write "' }],
  ['\u2026', { name: 'horizontal ellipsis', instead: 'write "..."' }],
  ['\u00b7', { name: 'middle dot', instead: 'write "-", "," or ":"' }],
  ['\u2022', { name: 'bullet', instead: 'write "-", "," or ":"' }],
  ['\u2192', { name: 'rightwards arrow', instead: 'write "->"' }],
  ['\u2190', { name: 'leftwards arrow', instead: 'write "<-"' }],
  ['\u00d7', { name: 'multiplication sign', instead: 'write "x"' }],
  ['\u00a0', { name: 'no-break space', instead: 'write a space' }],
  ['\u200b', { name: 'zero width space', instead: 'write nothing' }],
  ['\u200c', { name: 'zero width non-joiner', instead: 'write nothing' }],
  ['\u200d', { name: 'zero width joiner', instead: 'write nothing' }],
  ['\ufeff', { name: 'zero width no-break space', instead: 'write nothing' }],
]);

/** A currency's symbols as each locale displays them, wide and narrow, so `US$` and `$` both count. */
function currencySymbols(locales: readonly string[], currency: string): string[] {
  return locales.flatMap((locale) =>
    (['symbol', 'narrowSymbol'] as const).flatMap((currencyDisplay) =>
      new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay })
        .formatToParts(0)
        .filter((part) => part.type === 'currency')
        .map((part) => part.value),
    ),
  );
}

/**
 * The policy for one run. `carried` is the text the library's components show as their own defaults, whose
 * characters are allowed in authored copy too.
 */
export function copyPolicy(copy: CopyConfig, carried: readonly string[]): CopyPolicy {
  // maximize() fills in the likely script from CLDR's likely subtags: vi becomes vi-Latn-VN.
  const scripts = new Set(copy.locales.map((locale) => new Intl.Locale(locale).maximize().script ?? ''));
  const symbols = copy.currencies.flatMap((currency) => currencySymbols(copy.locales, currency));
  const languages = new Set(copy.locales.map((locale) => new Intl.Locale(locale).language));
  return {
    scripts: [...scripts].filter(Boolean).map((script) => new RegExp(`^\\p{Script_Extensions=${script}}$`, 'u')),
    extra: new Set([...symbols, ...carried].flatMap((text) => [...text.normalize('NFC')])),
    tells: [...languages].flatMap((language) => COPY_TELLS[language] ?? []),
  };
}

function allowed(char: string, policy: CopyPolicy): boolean {
  if (PRINTABLE_ASCII.test(char) || LINE_BREAK.test(char) || policy.extra.has(char)) return true;
  if (!LETTER_OR_MARK.test(char)) return false;
  return INHERITED_MARK.test(char) || policy.scripts.some((script) => script.test(char));
}

function codePoint(char: string): string {
  return `U+${(char.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0')}`;
}

function characterMessage(char: string): string {
  const known = INSTEAD.get(char);
  if (known) return `${codePoint(char)} ${known.name}: ${known.instead}`;
  if (EMOJI.test(char)) return `${codePoint(char)} emoji: write a word, or a library icon`;
  if (ARROW.test(char)) return `${codePoint(char)} arrow: write "->" or "<-"`;
  return `${codePoint(char)} is outside the locales and currencies copy names in zaku.yaml: write it in ASCII, or add its locale or currency there`;
}

/** Every rule one authored text breaks: each disallowed code point once, in order, then each tell once. */
export function copyIssues(text: string, policy: CopyPolicy): CopyIssue[] {
  const issues: CopyIssue[] = [];
  const seen = new Set<string>();
  for (const char of text.normalize('NFC')) {
    if (seen.has(char) || allowed(char, policy)) continue;
    seen.add(char);
    issues.push({ field: 'characters', message: characterMessage(char) });
  }
  for (const tell of policy.tells) {
    const match = tell.pattern.exec(text);
    if (match) issues.push({ field: 'tone', message: `"${match[0]}": ${tell.instead}` });
  }
  return issues;
}
