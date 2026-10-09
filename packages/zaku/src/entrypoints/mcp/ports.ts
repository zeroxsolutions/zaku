import { BridgePortOutOfRange } from '../../lib/domain/errors/index.js';
import { BRIDGE_PORT_RANGE, BRIDGE_PORTS } from '../../lib/schema/bridge.js';

/**
 * The ports zaku-mcp tries, in order: ZAKU_PORT alone when it is set, else every port the plugin's manifest
 * admits. An empty ZAKU_PORT counts as unset.
 * @throws BridgePortOutOfRange when ZAKU_PORT is not one of the admitted ports
 */
export function bridgePorts(env: Record<string, string | undefined>): readonly number[] {
  const value = env['ZAKU_PORT'];
  if (value === undefined || value === '') return BRIDGE_PORTS;
  const port = BRIDGE_PORTS.find((admitted) => String(admitted) === value);
  if (port === undefined) throw new BridgePortOutOfRange(value, BRIDGE_PORT_RANGE);
  return [port];
}
