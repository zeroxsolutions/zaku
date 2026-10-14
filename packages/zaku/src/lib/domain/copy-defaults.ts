/**
 * The copy section a zaku.yaml without one reads as. It sits outside the schema so the rules script,
 * which runs inside Figma, carries no validation library.
 */
export const DEFAULT_COPY: { locales: string[]; currencies: string[] } = { locales: ['en'], currencies: [] };
