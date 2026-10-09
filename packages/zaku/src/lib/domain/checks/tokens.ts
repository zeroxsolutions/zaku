import type { Rgba } from '../library.js';
import { contrastRatio, toHex } from '../colour.js';
import { tokenSets, type ColorToken, type TokenSet } from '../token-document.js';
import type { Check, Finding } from '../findings.js';

/** Text pairs shadcn's tokens are meant to be read in, each needing 4.5:1 (WCAG 2.2 SC 1.4.3); another design system names its own in zaku.yaml. */
export const CONTRAST_PAIRS: readonly (readonly [string, string])[] = [
  ['foreground', 'background'],
  ['card-foreground', 'card'],
  ['popover-foreground', 'popover'],
  ['primary-foreground', 'primary'],
  ['secondary-foreground', 'secondary'],
  ['muted-foreground', 'background'],
  ['muted-foreground', 'muted'],
  ['accent-foreground', 'accent'],
  ['destructive', 'background'],
  ['sidebar-foreground', 'sidebar'],
  ['sidebar-primary-foreground', 'sidebar-primary'],
  ['sidebar-accent-foreground', 'sidebar-accent'],
];

function rgbaOf(token: ColorToken): Rgba {
  const [r, g, b] = token.$value.components;
  return { r, g, b, a: token.$value.alpha };
}

export const tokensCheck: Check = ({ config, library, tokens }) => {
  if (!library || !tokens) return { notRun: 'library.json or tokens.json is missing' };
  const sets = tokenSets(tokens);
  const findings: Finding[] = [];
  for (const [scheme, set] of [
    ['Light', sets.light],
    ['Dark', sets.dark],
  ] as const) {
    const combo: Record<string, string> = { ...config.modes, semantic: scheme };
    const entry = library.tokens.find((snapshot) =>
      Object.entries(combo).every(([key, value]) => snapshot.combo[key] === value),
    );
    if (!entry) {
      const named = Object.entries(combo)
        .map(([key, value]) => `${key}=${value}`)
        .join(', ');
      findings.push({
        check: 'tokens',
        message: `the library snapshot has no tokens for ${named}`,
      });
      continue;
    }
    for (const [name, token] of Object.entries(set.color)) {
      const value = entry.values[`color/${name}`];
      const code = rgbaOf(token);
      if (typeof value !== 'object') {
        findings.push({
          check: 'tokens',
          field: `color/${name}`,
          message: `color/${name} is not in the library (${scheme})`,
        });
        continue;
      }
      const channel = Math.max(Math.abs(value.r - code.r), Math.abs(value.g - code.g), Math.abs(value.b - code.b));
      if (channel > 0.006 || Math.abs(value.a - code.a) > 0.01) {
        findings.push({
          check: 'tokens',
          field: `color/${name}`,
          message: `color/${name} is ${toHex(value)} in the library and ${toHex(code)} in code (${scheme})`,
        });
      }
    }
    for (const [name, token] of Object.entries(set.radius)) {
      const value = entry.values[`radius/${name}`];
      if (typeof value !== 'number' || Math.abs(value - token.$value.value) > 0.5) {
        findings.push({
          check: 'tokens',
          field: `radius/${name}`,
          message: `radius/${name} is ${String(value)} in the library and ${token.$value.value} in code (${scheme})`,
        });
      }
    }
  }
  return { findings };
};

function checkPairs(
  sets: { light: TokenSet; dark: TokenSet },
  pairs: readonly { label: [string, string]; roles: [string, string] }[],
): Finding[] {
  const findings: Finding[] = [];
  for (const [scheme, set] of [
    ['light', sets.light],
    ['dark', sets.dark],
  ] as const) {
    for (const { label, roles } of pairs) {
      const front = set.color[roles[0]];
      const back = set.color[roles[1]];
      if (!front || !back) continue;
      const ratio = contrastRatio(rgbaOf(front), rgbaOf(back));
      if (ratio < 4.5) {
        findings.push({
          check: 'contrast',
          field: `${label[0]}/${label[1]}`,
          message: `${label[0]} on ${label[1]} is ${ratio.toFixed(2)}:1 in ${scheme}, under 4.5:1`,
        });
      }
    }
  }
  return findings;
}

export const contrast: Check = ({ config, tokens }) => {
  if (!tokens) return { notRun: 'tokens.json is missing' };
  const sets = tokenSets(tokens);
  const system = config.designSystem;
  if ('shadcn' in system) {
    // shadcn names its text pairs; a token a product adds is read on the background.
    const project = Object.entries(sets.light.color)
      .filter(([, token]) => token.$extensions['com.zeroxsolutions.zaku'].axis === 'project')
      .map(([name]) => [name, 'background'] as const);
    return {
      findings: checkPairs(
        sets,
        [...CONTRAST_PAIRS, ...project].map(([fg, bg]) => ({ label: [fg, bg], roles: [fg, bg] })),
      ),
    };
  }
  const { contrast: pairs, colors } = system.dtcg;
  if (pairs.length === 0)
    return {
      notRun: 'zaku.yaml names no contrast pairs for the design system (designSystem.dtcg.contrast)',
    };
  // A pair names DTCG token paths; tokens.json keys a colour by its path inside the colour group.
  const role = (path: string): string =>
    (path.startsWith(`${colors}.`) ? path.slice(colors.length + 1) : path).replaceAll('.', '/');
  const findings: Finding[] = [];
  const known = pairs.filter(([fg, bg]) => {
    const missing = [fg, bg].find((path) => !sets.light.color[role(path)]);
    if (missing)
      findings.push({
        check: 'contrast',
        field: `${fg}/${bg}`,
        message: `${missing} is not a colour role of the design system`,
      });
    return !missing;
  });
  findings.push(
    ...checkPairs(
      sets,
      known.map(([fg, bg]) => ({ label: [fg, bg], roles: [role(fg), role(bg)] })),
    ),
  );
  return { findings };
};
