import type { ICommandHandler } from '@zeroxsolutions/cosmic';
import { inject, injectable } from 'tsyringe';
import { RecordBudgetCalls } from '../commands/index.js';
import { TOKENS } from '../constants/index.js';
import type { IBudgetLedger } from '../repositories/index.js';

/** Handles RecordBudgetCalls by adding the calls to the seat's ledger. */
@injectable({ token: TOKENS.COMMAND_HANDLER })
export class RecordBudgetCallsHandler implements ICommandHandler<RecordBudgetCalls, void> {
  readonly command = RecordBudgetCalls;

  constructor(@inject(TOKENS.BUDGET_LEDGER) private readonly ledger: IBudgetLedger) {}

  handle(command: RecordBudgetCalls): Promise<void> {
    return this.ledger.record({
      day: command.day,
      seat: command.seat,
      run: command.run,
      kind: command.kind,
      count: command.count,
    });
  }
}
