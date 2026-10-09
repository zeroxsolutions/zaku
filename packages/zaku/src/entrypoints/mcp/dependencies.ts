import { bootstrap, type MessageBus } from '@zeroxsolutions/cosmic';
import { container } from 'tsyringe';
import type { FigmaBridge } from '../../lib/adapters/figma-bridge.js';
import type { FigmaRest } from '../../lib/adapters/figma-rest.js';
import type { RecipePageReader } from '../../lib/adapters/playwright-recipe-page.js';
import type { RunCommand } from '../../lib/adapters/shadcn-preset.js';
import { TOKENS } from '../../lib/constants/index.js';
import type { IBudgetLedger } from '../../lib/repositories/budget-ledger.js';
import type { IGuideRepository } from '../../lib/repositories/guide-repository.js';
import { unavailable } from '../../lib/utils/unavailable.js';
import '../../lib/handlers/index.js';
import '../../lib/repositories/index.js';

/** Builds the server's container: the bridge and the guides are real, the CLI-only seams stand in. */
export function compose(bridge: FigmaBridge, guides: IGuideRepository): MessageBus {
  const scope = container.createChildContainer();
  scope.register(TOKENS.CLOCK, { useValue: { now: () => new Date() } });
  scope.register(TOKENS.FIGMA_BRIDGE, { useValue: bridge });
  scope.register(TOKENS.GUIDE_REPOSITORY, { useValue: guides });
  scope.register(TOKENS.FIGMA_REST, { useValue: unavailable<FigmaRest>('the Figma REST client (use the zaku CLI)') });
  const cliOnly = (what: string) => (): Promise<never> =>
    Promise.reject(new Error(`${what} is not available in zaku-mcp; use the zaku CLI`));
  scope.register(TOKENS.RUN_COMMAND, { useValue: cliOnly('running a command') as RunCommand });
  scope.register(TOKENS.RECIPE_PAGE_READER, { useValue: cliOnly('the recipe page') as RecipePageReader });
  scope.register(TOKENS.BUDGET_LEDGER, { useValue: unavailable<IBudgetLedger>('the budget ledger') });
  return bootstrap(scope, { commandHandler: TOKENS.COMMAND_HANDLER });
}
