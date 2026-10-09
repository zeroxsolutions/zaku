import { BridgePortOutOfRange } from '../../lib/domain/errors/index.js';
import { BRIDGE_PORTS } from '../../lib/schema/bridge.js';
import { bridgePorts } from './ports.js';

describe('the ports zaku-mcp tries', () => {
  it('tries every port the manifest admits, in order, when ZAKU_PORT is unset', () => {
    expect(bridgePorts({})).toEqual([7337, 7338, 7339, 7340, 7341, 7342, 7343, 7344, 7345, 7346]);
    expect(bridgePorts({ ZAKU_PORT: '' })).toEqual(BRIDGE_PORTS);
  });

  it('tries ZAKU_PORT alone when it is inside the range', () => {
    expect(bridgePorts({ ZAKU_PORT: '7340' })).toEqual([7340]);
  });

  it.each(['80', '9000', '7336', '7347', 'abc', '7340.5'])('refuses ZAKU_PORT=%s, naming the range', (value) => {
    expect(() => bridgePorts({ ZAKU_PORT: value })).toThrow(BridgePortOutOfRange);
    expect(() => bridgePorts({ ZAKU_PORT: value })).toThrow(`ZAKU_PORT=${value}`);
    expect(() => bridgePorts({ ZAKU_PORT: value })).toThrow('7337-7346');
  });
});
