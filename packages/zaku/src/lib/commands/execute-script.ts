import { DomainCommand } from '@zeroxsolutions/cosmic';

export interface ExecuteScriptInput {
  /** The connected file's name; required only when more than one is connected. */
  file: string | undefined;
  script: string;
  /** `strict` rolls back on any finding; `report` keeps the change and returns the findings. */
  mode: 'strict' | 'report';
}

/** Run a script in an open Figma file, check what it touched, and keep or roll back the change. */
export class ExecuteScript extends DomainCommand implements ExecuteScriptInput {
  readonly file: string | undefined;
  readonly script: string;
  readonly mode: 'strict' | 'report';

  constructor(input: ExecuteScriptInput) {
    super();
    this.file = input.file;
    this.script = input.script;
    this.mode = input.mode;
  }
}
