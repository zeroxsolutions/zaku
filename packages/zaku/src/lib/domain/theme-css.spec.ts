import { parseThemeCss } from './theme-css.js';

const css = `@import 'tailwindcss';
@theme inline {
  --color-primary: var(--primary);
}
:root {
  --background: oklch(1 0 0);
  --primary: oklch(0.508 0.118 165.612);
  --radius: 0.625rem;
}
.dark {
  --background: oklch(0.141 0.005 285.823);
  --primary: oklch(0.432 0.095 166.913);
}`;

describe('parseThemeCss', () => {
  it('reads the :root and .dark declarations and ignores @theme', () => {
    expect(parseThemeCss(css)).toEqual({
      light: {
        background: 'oklch(1 0 0)',
        primary: 'oklch(0.508 0.118 165.612)',
        radius: '0.625rem',
      },
      dark: { background: 'oklch(0.141 0.005 285.823)', primary: 'oklch(0.432 0.095 166.913)' },
    });
  });
});
