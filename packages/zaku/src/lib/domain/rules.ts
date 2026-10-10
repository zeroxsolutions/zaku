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
    fix: "Bind the paint with figma.variables.setBoundVariableForPaint, the padding or gap with node.setBoundVariable to the library's spacing/<step> token for the class's step, and give a text a library text style. Documentation (the library's Thumbnail and Component for Docs pages and an entry page outside its components; a product file's <kind> / <Component> page and a feature's _components Section, outside the components) keeps the measures and type its reference writes as numbers; only its paints are bound.",
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
    fix: "Change copy and component properties only; pick another variant, or change the component in the library. Documentation may size the instances it lays out (a table's head and cell to its column).",
  },
  documentation: {
    id: 'documentation',
    why: "The documentation is zaku's frame around every library, chosen once: a documentation component or a view part drawn to other measures reads as another product, and a designer stops finding each header, table and card where the last library had it.",
    fix: "Draw the part to building-the-library's measures table: its name, size and sizing, auto layout, padding and gap, its text's size, line height and weight, and its component properties and placeholder text. Its type is the documentation's own, never the library's text styles.",
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
