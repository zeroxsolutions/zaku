import type { ICommandHandler, IClock, MessageBus } from '@zeroxsolutions/cosmic';
import type { InjectionToken } from 'tsyringe';
import type { FigmaBridge } from '../adapters/figma-bridge.js';
import type { FigmaRest } from '../adapters/figma-rest.js';
import type { RecipePageReader } from '../adapters/playwright-recipe-page.js';
import type { RunCommand } from '../adapters/shadcn-preset.js';
import type { IBudgetLedger } from '../repositories/budget-ledger.js';
import type { IDesignConfigRepository } from '../repositories/design-config-repository.js';
import type { IGuideRepository } from '../repositories/guide-repository.js';
import type { IJsonSchemaFiles } from '../repositories/json-schema-files.js';
import type { IRecipeRepository } from '../repositories/recipe-repository.js';
import type { ISourceFiles } from '../repositories/source-files.js';
import type { ITokenDocumentRepository } from '../repositories/token-document-repository.js';

/** One token per seam the zaku context wires; the cast carries each value's type to register and resolve. */
export const TOKENS = {
  MESSAGE_BUS: 'zaku.messageBus' as InjectionToken<MessageBus>,
  CLOCK: 'zaku.clock' as InjectionToken<IClock>,
  COMMAND_HANDLER: 'zaku.commandHandler' as InjectionToken<ICommandHandler>,
  FIGMA_REST: 'zaku.figmaRest' as InjectionToken<FigmaRest>,
  FIGMA_BRIDGE: 'zaku.figmaBridge' as InjectionToken<FigmaBridge>,
  RUN_COMMAND: 'zaku.runCommand' as InjectionToken<RunCommand>,
  RECIPE_PAGE_READER: 'zaku.recipePageReader' as InjectionToken<RecipePageReader>,
  BUDGET_LEDGER: 'zaku.budgetLedger' as InjectionToken<IBudgetLedger>,
  DESIGN_CONFIG_REPOSITORY: 'zaku.designConfigRepository' as InjectionToken<IDesignConfigRepository>,
  TOKEN_DOCUMENT_REPOSITORY: 'zaku.tokenDocumentRepository' as InjectionToken<ITokenDocumentRepository>,
  RECIPE_REPOSITORY: 'zaku.recipeRepository' as InjectionToken<IRecipeRepository>,
  JSON_SCHEMA_FILES: 'zaku.jsonSchemaFiles' as InjectionToken<IJsonSchemaFiles>,
  SOURCE_FILES: 'zaku.sourceFiles' as InjectionToken<ISourceFiles>,
  GUIDE_REPOSITORY: 'zaku.guideRepository' as InjectionToken<IGuideRepository>,
} as const;
