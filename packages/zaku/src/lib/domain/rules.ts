import type { CheckId } from './findings.js';

export interface RuleGuide {
  id: CheckId;
  why: string;
  fix: string;
}

/** The rules an execute is held to; each becomes a page on the docs site. */
export const RULE_GUIDES: Partial<Record<CheckId, RuleGuide>> = {
  binding: {
    id: 'binding',
    why: 'A raw colour, padding, gap or unstyled text does not move when the library or the theme changes, so the frame drifts from the code.',
    fix: 'Bind the paint with figma.variables.setBoundVariableForPaint, the padding or gap with node.setBoundVariable, and give a text a library text style.',
  },
  overrides: {
    id: 'overrides',
    why: 'An instance restyled in place is a fork of the component that nobody can update from the library.',
    fix: 'Change copy and component properties only; pick another variant, or change the component in the library.',
  },
  naming: {
    id: 'naming',
    why: 'A layer named Frame 12 says nothing to the next reader, the outline or the code.',
    fix: 'Name each layer for what it holds.',
  },
};

export function formatRule(rule: RuleGuide): string {
  return `# ${rule.id}\n\n## Why\n\n${rule.why}\n\n## Fix\n\n${rule.fix}\n`;
}
