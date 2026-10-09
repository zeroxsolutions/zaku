import { BRIDGE_PORTS } from '@zeroxsolutions/zaku/schema';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const manifest = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', 'manifest.json'), 'utf8')) as {
  networkAccess: { allowedDomains: string[] };
};

describe('the manifest', () => {
  // Figma blocks a socket to a localhost port the manifest does not list, and says nothing in the panel.
  it('admits every port zaku-mcp may listen on, and no other', () => {
    expect(manifest.networkAccess.allowedDomains).toEqual(BRIDGE_PORTS.map((port) => `ws://localhost:${port}`));
  });
});
