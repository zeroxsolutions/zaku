import { container, type InjectionToken } from 'tsyringe';
import * as commands from '../commands/index.js';
import { TOKENS } from '../constants/index.js';
import './index.js';

describe('the command handler family', () => {
  it('has one handler registered for every command the commands barrel declares', () => {
    const scope = container.createChildContainer();
    for (const token of Object.values(TOKENS)) {
      if (token !== TOKENS.COMMAND_HANDLER) scope.register(token as InjectionToken<unknown>, { useValue: {} });
    }
    const handled = scope.resolveAll(TOKENS.COMMAND_HANDLER).map((handler) => handler.command);
    const declared = Object.values(commands).filter((value) => typeof value === 'function');
    expect(new Set(handled)).toEqual(new Set(declared));
    expect(handled).toHaveLength(declared.length);
  });
});
