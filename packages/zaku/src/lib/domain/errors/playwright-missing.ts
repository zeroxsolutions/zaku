/** The product has no Playwright of its own to read the recipe page with. */
export class PlaywrightMissing extends Error {
  constructor() {
    super('zaku recipe loads playwright from the product: npm i -D playwright, then npx playwright install chromium');
    this.name = 'PlaywrightMissing';
  }
}
