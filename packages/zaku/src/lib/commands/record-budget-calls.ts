import { DomainCommand } from '@zeroxsolutions/cosmic';
import type { CallKind } from '../repositories/budget-ledger.js';

export interface RecordBudgetCallsInput {
  /** The ledger day, as today() writes it. */
  day: string;
  /** The Figma seat the calls count against. */
  seat: string;
  /** The agent run the calls belong to. */
  run: string;
  /** Which calls. */
  kind: CallKind;
  /** How many. */
  count: number;
}

/** Add calls to the seat's ledger. */
export class RecordBudgetCalls extends DomainCommand implements RecordBudgetCallsInput {
  readonly day: string;
  readonly seat: string;
  readonly run: string;
  readonly kind: CallKind;
  readonly count: number;

  constructor(input: RecordBudgetCallsInput) {
    super();
    this.day = input.day;
    this.seat = input.seat;
    this.run = input.run;
    this.kind = input.kind;
    this.count = input.count;
  }
}
