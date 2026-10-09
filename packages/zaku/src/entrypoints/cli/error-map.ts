import {
  CssRequired,
  FigmaTokenMissing,
  PlaywrightMissing,
  RecipePageFailed,
  RecipeUrlRequired,
} from '../../lib/domain/errors/index.js';

/** The exit code and line a refusal ends the CLI with; null for an error the CLI reports as a failure. */
export function refusalOf(error: unknown): { code: number; line: string } | null {
  if (error instanceof CssRequired || error instanceof RecipeUrlRequired || error instanceof PlaywrightMissing) {
    return { code: 3, line: error.message };
  }
  if (error instanceof FigmaTokenMissing) return { code: 3, line: error.message };
  if (error instanceof RecipePageFailed) return { code: 2, line: `zaku recipe: ${error.message}` };
  return null;
}
