import { container } from 'tsyringe';
import { WriteTokens } from '../commands/index.js';
import { TOKENS } from '../constants/index.js';
import { CssRequired } from '../domain/errors/index.js';
import type { ZakuConfig } from '../schema/zaku-config.js';
import { testConfig } from '../../test/fixtures.fixture.js';
import { WriteTokensHandler } from './write-tokens.js';

function handlerWith(config: ZakuConfig): WriteTokensHandler {
  const scope = container.createChildContainer();
  scope.register(TOKENS.DESIGN_CONFIG_REPOSITORY, {
    useValue: { read: async () => config, readOptional: async () => config },
  });
  scope.register(TOKENS.TOKEN_DOCUMENT_REPOSITORY, {
    useValue: { save: async () => '/d/tokens.json' },
  });
  scope.register(TOKENS.SOURCE_FILES, {
    useValue: { readText: async () => '', readJson: async () => ({}) },
  });
  scope.register(TOKENS.RUN_COMMAND, { useValue: async () => '' });
  return scope.resolve(WriteTokensHandler);
}

describe('WriteTokensHandler', () => {
  it('refuses a shadcn design system with no stylesheet', async () => {
    const handle = handlerWith(testConfig()).handle(new WriteTokens({ root: '/d', cwd: '/p', css: null }));
    await expect(handle).rejects.toBeInstanceOf(CssRequired);
  });
});
