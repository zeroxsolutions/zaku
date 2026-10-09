import { bootstrap, type MessageBus } from '@zeroxsolutions/cosmic';
import { homedir } from 'node:os';
import { container } from 'tsyringe';
import type { FigmaBridge } from '../../lib/adapters/figma-bridge.js';
import type { FigmaRest } from '../../lib/adapters/figma-rest.js';
import {
  readRecipePage,
  type PlaywrightModule,
  type RecipePageReader,
} from '../../lib/adapters/playwright-recipe-page.js';
import type { RunCommand } from '../../lib/adapters/shadcn-preset.js';
import { TOKENS } from '../../lib/constants/index.js';
import { FigmaTokenMissing, PlaywrightMissing } from '../../lib/domain/errors/index.js';
import { FileBudgetLedger, ledgerPath } from '../../lib/repositories/budget-ledger.js';
import { unavailable } from '../../lib/utils/unavailable.js';
import '../../lib/handlers/index.js';
import '../../lib/repositories/index.js';

export interface CliSeams {
  env: Record<string, string | undefined>;
  now: () => Date;
  run: RunCommand;
  /** Loaded only when a command reads the recipe page, so the other commands never load a browser driver. */
  loadPlaywright: () => Promise<PlaywrightModule | null>;
  /** Null when FIGMA_TOKEN is unset; a REST command then refuses before it sends. */
  rest: FigmaRest | null;
}

/** Builds one invocation's container from what only the CLI process has, and wires the bus over it. */
export function compose(seams: CliSeams): MessageBus {
  const scope = container.createChildContainer();
  scope.register(TOKENS.CLOCK, { useValue: { now: seams.now } });
  scope.register(TOKENS.RUN_COMMAND, { useValue: seams.run });
  scope.register(TOKENS.BUDGET_LEDGER, {
    useValue: new FileBudgetLedger(ledgerPath(seams.env, process.platform, homedir())),
  });
  const reader: RecipePageReader = async (options) => {
    const playwright = await seams.loadPlaywright();
    if (!playwright) throw new PlaywrightMissing();
    return readRecipePage(playwright, options);
  };
  scope.register(TOKENS.RECIPE_PAGE_READER, { useValue: reader });
  scope.register(TOKENS.FIGMA_REST, { useValue: seams.rest ?? missingRest() });
  scope.register(TOKENS.FIGMA_BRIDGE, { useValue: unavailable<FigmaBridge>('the Figma bridge (run zaku-mcp)') });
  return bootstrap(scope, { commandHandler: TOKENS.COMMAND_HANDLER });
}

/** Every handler is built at bootstrap, so a REST client must exist even when no token was given. */
function missingRest(): FigmaRest {
  return new Proxy({} as FigmaRest, {
    get: () => () => Promise.reject(new FigmaTokenMissing('zaku')),
  });
}
