/** A shadcn design system reads its tokens from the stylesheet that declares :root and .dark. */
export class CssRequired extends Error {
  constructor() {
    super('zaku tokens needs --css, the stylesheet that declares :root and .dark');
    this.name = 'CssRequired';
  }
}
