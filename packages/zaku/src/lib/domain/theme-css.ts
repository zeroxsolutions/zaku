function declarations(css: string, selector: string): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const body = new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`).exec(css)?.[1];
  if (body === undefined) return {};
  const out: Record<string, string> = {};
  for (const [, name, value] of body.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    if (name !== undefined && value !== undefined) out[name] = value.trim();
  }
  return out;
}

/** The custom properties a shadcn stylesheet declares under `:root` and `.dark`. */
export function parseThemeCss(css: string): {
  light: Record<string, string>;
  dark: Record<string, string>;
} {
  return { light: declarations(css, ':root'), dark: declarations(css, '.dark') };
}
