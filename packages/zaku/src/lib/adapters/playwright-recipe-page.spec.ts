import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import * as playwright from 'playwright';
import { readRecipePage } from './playwright-recipe-page.js';

const STYLE = `
  :root { --bg: oklch(1 0 0); --fg: oklch(0.141 0.005 285.823); }
  .dark { --bg: oklch(0.141 0.005 285.823); --fg: oklch(0.985 0 0); }
  @media (prefers-color-scheme: dark) { .media { --bg: rgb(0, 0, 255); } }
  button { display: inline-flex; gap: 6px; padding: 0 10px; height: 32px; border: 1px solid var(--fg);
    border-radius: 8px; background: var(--bg); color: var(--fg); font: 14px sans-serif;
    transition: background-color 2s; }
  button:hover { background: rgb(255, 0, 0); }
`;

const PAGES: Record<string, string> = {
  '/recipe': `<style>${STYLE}</style>
    <button data-zaku-component="Button" data-zaku-props='{"variant":"outline"}'><span data-zaku-part="label">Go</span></button>
    <button data-zaku-component="Button" data-zaku-props='{"variant":"outline","state":"hover"}' data-zaku-force="hover"><span data-zaku-part="label">Go</span></button>
    <div data-zaku-component="Card" data-zaku-props="{}" style="padding: 24px">
      <button data-zaku-component="Button" data-zaku-props='{"variant":"ghost"}'><span data-zaku-part="label">In</span></button>
    </div>`,
  '/media': `<style>${STYLE}</style><div class="media"><button data-zaku-component="Button" data-zaku-props="{}">Go</button></div>`,
  '/empty': '<p>nothing marked</p>',
  '/force': `<button data-zaku-component="Button" data-zaku-props="{}" data-zaku-force="checked">Go</button>`,
};

let server: Server;
let base: string;

beforeAll(async () => {
  server = createServer((request, response) => {
    const page = PAGES[request.url ?? ''];
    response
      .writeHead(page ? 200 : 404, { 'content-type': 'text/html' })
      .end(page ? `<!doctype html><html><body>${page}</body></html>` : '');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

describe('readRecipePage', { timeout: 60_000 }, () => {
  it('reads every marked part in light and with the dark class, a nested component as its own', async () => {
    const read = await readRecipePage(playwright, {
      url: `${base}/recipe`,
      dark: 'class',
      darkClass: 'dark',
    });
    const roots = read.light.filter((part) => part.part === 'root');
    expect(roots.map((part) => [part.component, part.props])).toEqual([
      ['Button', '{"variant":"outline"}'],
      ['Button', '{"variant":"outline","state":"hover"}'],
      ['Card', '{}'],
      ['Button', '{"variant":"ghost"}'],
    ]);
    expect(read.light.filter((part) => part.root === 2)).toHaveLength(1);
    const outline = read.light[0];
    expect(outline).toMatchObject({
      background: 'oklch(1 0 0)',
      borderWidths: [1, 1, 1, 1],
      height: 32,
      padding: [0, 10, 0, 10],
      gap: '6px',
      radii: ['8px', '8px', '8px', '8px'],
      fontSize: 14,
    });
    expect(read.light[1]).toMatchObject({ part: 'label', root: 0 });
    expect(read.dark[0]?.background).toBe('oklch(0.141 0.005 285.823)');
  });

  it('forces a state the page names, with transitions off so the value is the final one', async () => {
    const read = await readRecipePage(playwright, {
      url: `${base}/recipe`,
      dark: 'class',
      darkClass: 'dark',
    });
    expect(read.light.find((part) => part.root === 1 && part.part === 'root')?.background).toBe('rgb(255, 0, 0)');
  });

  it('emulates the dark colour scheme when the design system reads it from the media query', async () => {
    const read = await readRecipePage(playwright, {
      url: `${base}/media`,
      dark: 'media',
      darkClass: 'dark',
    });
    expect(read.light[0]?.background).toBe('oklch(1 0 0)');
    expect(read.dark[0]?.background).toBe('rgb(0, 0, 255)');
  });

  it('refuses a page that marks nothing, and a state it cannot force', async () => {
    await expect(
      readRecipePage(playwright, { url: `${base}/empty`, dark: 'class', darkClass: 'dark' }),
    ).rejects.toThrow(`${base}/empty marks no element with data-zaku-component`);
    await expect(
      readRecipePage(playwright, { url: `${base}/force`, dark: 'class', darkClass: 'dark' }),
    ).rejects.toThrow(
      'Button: data-zaku-force names checked; zaku forces hover, focus, focus-visible, focus-within or active',
    );
  });
});
