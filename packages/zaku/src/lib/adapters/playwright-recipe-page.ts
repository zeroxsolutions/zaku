import type * as Playwright from 'playwright';
import type { RawPart, Scheme } from '../domain/build-recipe.js';

/** What `zaku recipe` uses of Playwright, loaded from the product. */
export type PlaywrightModule = Pick<typeof Playwright, 'chromium'>;

export interface RecipePageOptions {
  url: string;
  /** `class` adds `darkClass` to the root element; `media` emulates `prefers-color-scheme: dark`. */
  dark: 'class' | 'media';
  darkClass: string;
}

/** Reads the recipe page in light and dark; the CLI builds one over the product's Playwright. */
export type RecipePageReader = (options: RecipePageOptions) => Promise<Record<Scheme, RawPart[]>>;

const FORCIBLE = ['hover', 'focus', 'focus-visible', 'focus-within', 'active'];

/** A transition caught halfway reads as a colour the code never settles on. */
const STILL = '*, *::before, *::after { transition: none !important; animation: none !important; }';

/**
 * Runs in the page, so it is source text: a bundler that renames or wraps a function would hand the
 * browser a helper it does not have. A part belongs to the nearest root above it.
 */
const READ_PARTS = `(() => {
  const px = (value) => Number.parseFloat(value) || 0;
  const side = (style, name) => (style['border' + name + 'Style'] === 'none' ? 0 : px(style['border' + name + 'Width']));
  const drawn = (style) => ['Top', 'Right', 'Bottom', 'Left'].find((name) => side(style, name) > 0) ?? 'Top';
  const roots = [...document.querySelectorAll('[data-zaku-component]')];
  const owner = (element) => (element.hasAttribute('data-zaku-component') ? element.parentElement : element)?.closest('[data-zaku-component]');
  return roots.flatMap((root, index) => {
    const parts = [['root', root], ...[...root.querySelectorAll('[data-zaku-part]')]
      .filter((element) => owner(element) === root)
      .map((element) => [element.getAttribute('data-zaku-part'), element])];
    return parts.map(([part, element]) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      const laidOut = /flex|grid/.test(style.display);
      const column = style.flexDirection.startsWith('column');
      return {
        root: index,
        component: root.getAttribute('data-zaku-component'),
        props: root.getAttribute('data-zaku-props') ?? '{}',
        part,
        background: style.backgroundColor,
        color: style.color,
        borderColor: style['border' + drawn(style) + 'Color'],
        borderWidths: [side(style, 'Top'), side(style, 'Right'), side(style, 'Bottom'), side(style, 'Left')],
        width: box.width,
        height: box.height,
        padding: [px(style.paddingTop), px(style.paddingRight), px(style.paddingBottom), px(style.paddingLeft)],
        gap: laidOut ? (column ? style.rowGap : style.columnGap) : 'normal',
        radii: [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius],
        fontSize: px(style.fontSize),
        fontFamily: style.fontFamily,
      };
    });
  });
})()`;

async function forceStates(page: Playwright.Page): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
  const { nodeIds } = await cdp.send('DOM.querySelectorAll', {
    nodeId: root.nodeId,
    selector: '[data-zaku-force]',
  });
  for (const nodeId of nodeIds) {
    const { attributes } = await cdp.send('DOM.getAttributes', { nodeId });
    const attribute = (name: string): string => attributes[attributes.indexOf(name) + 1] ?? '';
    const classes = attribute('data-zaku-force')
      .split(/[\s,]+/)
      .filter(Boolean);
    const unknown = classes.find((name) => !FORCIBLE.includes(name));
    if (unknown) {
      throw new Error(
        `${attribute('data-zaku-component')}: data-zaku-force names ${unknown}; zaku forces ${FORCIBLE.slice(0, -1).join(', ')} or active`,
      );
    }
    await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: classes });
  }
}

async function readScheme(browser: Playwright.Browser, options: RecipePageOptions, scheme: Scheme): Promise<RawPart[]> {
  const context = await browser.newContext({
    colorScheme: options.dark === 'media' ? scheme : 'light',
  });
  try {
    const page = await context.newPage();
    await page.goto(options.url, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: STILL });
    if (scheme === 'dark' && options.dark === 'class') {
      await page.evaluate(`document.documentElement.classList.add(${JSON.stringify(options.darkClass)})`);
    }
    await page.evaluate('document.fonts.ready.then(() => true)');
    await forceStates(page);
    const parts = (await page.evaluate(READ_PARTS)) as RawPart[];
    if (parts.length === 0) throw new Error(`${options.url} marks no element with data-zaku-component`);
    return parts;
  } finally {
    await context.close();
  }
}

/** Opens the product's recipe page in light and in dark and reads every marked part as computed. */
export async function readRecipePage(
  playwright: PlaywrightModule,
  options: RecipePageOptions,
): Promise<Record<Scheme, RawPart[]>> {
  const browser = await playwright.chromium.launch();
  try {
    return {
      light: await readScheme(browser, options, 'light'),
      dark: await readScheme(browser, options, 'dark'),
    };
  } finally {
    await browser.close();
  }
}
