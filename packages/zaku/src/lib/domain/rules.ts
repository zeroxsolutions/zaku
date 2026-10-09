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
    fix: "Bind the paint with figma.variables.setBoundVariableForPaint, the padding or gap with node.setBoundVariable, and give a text a library text style. The library's documentation (the Thumbnail and Component for Docs pages, and an entry page outside its components) keeps the measures and type its reference writes as numbers; only its paints are bound.",
  },
  overlap: {
    id: 'overlap',
    why: 'An item drawn over another, or past the edge of the frame or set that clips it, cannot be seen or picked, and its label prints over its neighbour.',
    fix: 'Lay the items out apart: a component set as one run or a grid of its variants, with gaps, the set hugging them.',
  },
  placement: {
    id: 'placement',
    why: 'An item outside the container the skill names is one nobody finds there: a screen frame outside its Sections, a library component on its page outside its component view, with no documentation and no page surface behind it.',
    fix: "Move it in: a screen frame into its screen and state Sections, a component set into the demo card of its entry's component view.",
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
