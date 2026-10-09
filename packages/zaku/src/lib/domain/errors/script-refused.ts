/** The script makes a call an execute may not make. */
export class ScriptRefused extends Error {
  constructor(readonly calls: readonly string[]) {
    super(`ScriptRefused: the script calls ${calls.join(', ')}`);
    this.name = 'ScriptRefused';
  }
}
