import { parseLsof, portHolders } from './port-holders.js';

describe('portHolders', () => {
  it("reads lsof's field output into the process holding the port", () => {
    expect(parseLsof(7337, 'p94011\nczaku-mcp-darwin-arm64\n')).toEqual([
      { port: 7337, pid: 94011, command: 'zaku-mcp-darwin-arm64' },
    ]);
    expect(parseLsof(7337, '')).toEqual([]);
  });

  it('asks only about the panel ports below the hub, and none when the hub has no port', async () => {
    const asked: string[] = [];
    const run = async (_cmd: string, args: readonly string[]): Promise<string> => {
      asked.push(args.join(' '));
      return args.includes('-iTCP:7337') ? 'p1\ncold\n' : '';
    };
    expect(await portHolders([7337, 7338, 7339], 7339, run)).toEqual([{ port: 7337, pid: 1, command: 'old' }]);
    expect(asked).toHaveLength(2);
    expect(await portHolders([7337, 7338], null, run)).toEqual([]);
  });

  it('answers none when lsof cannot run', async () => {
    const run = async (): Promise<string> => {
      throw new Error('ENOENT');
    };
    expect(await portHolders([7337, 7338], 7338, run)).toEqual([]);
  });
});
