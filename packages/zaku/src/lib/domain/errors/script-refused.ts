import { DYNAMIC_CODE_CALLS } from '../script-refusal.js';

/** The script makes a call an execute may not make. */
export class ScriptRefused extends Error {
  constructor(readonly calls: readonly string[]) {
    const dynamic = calls.some((call) => DYNAMIC_CODE_CALLS.has(call));
    super(
      `ScriptRefused: the script calls ${calls.join(', ')}` +
        (dynamic
          ? '. Code built from a string at run time is not read by these checks; write the helpers into the script itself, at its top, in every script that uses them'
          : ''),
    );
    this.name = 'ScriptRefused';
  }
}
