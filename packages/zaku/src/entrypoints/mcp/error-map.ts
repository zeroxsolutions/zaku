import {
  FileNotConnected,
  FileRequired,
  PairingNotFound,
  PluginNotConnected,
  ScriptRefused,
  UnknownTopic,
} from '../../lib/domain/errors/index.js';

/**
 * The text a refusal answers a tool call with; null for a failure the server reports as an error. A plugin
 * cannot connect while the port is someone else's, so that refusal names the port problem too.
 */
export function refusalText(error: unknown, portError: string | null): string | null {
  if (error instanceof PluginNotConnected && portError !== null)
    return `${error.message}; zaku-mcp is not listening: ${portError}`;
  if (
    error instanceof PluginNotConnected ||
    error instanceof FileRequired ||
    error instanceof FileNotConnected ||
    error instanceof PairingNotFound ||
    error instanceof ScriptRefused ||
    error instanceof UnknownTopic
  )
    return error.message;
  return null;
}
