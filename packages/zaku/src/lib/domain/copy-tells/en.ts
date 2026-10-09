import type { CopyTell } from './index.js';

const APOSTROPHE = "['\u2019]";

/**
 * Phrases a model writes into interface copy and a product team cuts, each with what to write instead.
 * Every entry is named by at least one of: Wikipedia's "Signs of AI writing" (its AI vocabulary, its
 * negative parallelisms, its "it's important to note" and its wordy constructions), the GOV.UK style
 * guide's "Words to avoid", Sathya's "Avoid landing page words" (Microcopy Examples, 23 December 2024),
 * or the gundam plugin's cutting-ai-tells (rules 7, 9, 23 and 31). A phrase joins only with such a
 * source, or from a run or a session that shows a model writing it into copy.
 */
export const EN_TELLS: readonly CopyTell[] = [
  { pattern: /\bdelv(?:e|es|ed|ing)\b/iu, instead: 'write "look at" or "read"' },
  { pattern: /\bleverag(?:e|es|ed|ing)\b/iu, instead: 'write "use"' },
  { pattern: /\butili[sz](?:e|es|ed|ing|ation)\b/iu, instead: 'write "use"' },
  { pattern: /\brobust(?:ly|ness)?\b/iu, instead: 'write what it withstands' },
  { pattern: /\btapestr(?:y|ies)\b/iu, instead: 'write "mix", or name the parts' },
  { pattern: /\btestaments?\b/iu, instead: 'write "proof", or the fact itself' },
  { pattern: /\bvibrant(?:ly)?\b/iu, instead: 'write "busy", or what is there' },
  { pattern: /\bempower(?:s|ed|ing|ment)?\b/iu, instead: 'write "let" or "allow"' },
  { pattern: /\bunlock(?:s|ed|ing)?\b/iu, instead: 'write "get" or "open"' },
  { pattern: /\bunleash(?:es|ed|ing)?\b/iu, instead: 'write "use" or "start"' },
  { pattern: /\bgame[- ]?changers?\b/iu, instead: 'write what it changes' },
  { pattern: /\bsupercharg(?:e|es|ed|ing)\b/iu, instead: 'write "speed up", with the figure' },
  { pattern: new RegExp(`\\blet${APOSTROPHE}s\\b`, 'iu'), instead: 'write the action itself, such as "Plan a trip"' },
  {
    pattern: new RegExp(`\\b(?:it${APOSTROPHE}s|it is) (?:important|worth|crucial) (?:to note|noting)\\b`, 'iu'),
    instead: 'delete it',
  },
  { pattern: /\bin order to\b/iu, instead: 'write "to"' },
  { pattern: /\bnot (?:just|only|merely)\b[^.!?]{0,80}?\bbut\b/iu, instead: 'write the second half on its own' },
];
