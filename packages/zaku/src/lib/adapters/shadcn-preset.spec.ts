import { decodePreset, SHADCN_VERSION } from './shadcn-preset.js';

const output = `Preset
  code         aCm3pr3s7
  version      b
  style        nova
  baseColor    zinc
  theme        emerald
  chartColor   purple
  iconLibrary  lucide
  font         inter
  fontHeading  inherit
  radius       default
  menuAccent   subtle
  menuColor    default
  url          https://ui.shadcn.com/create?preset=aCm3pr3s7
`;

describe('decodePreset', () => {
  it('runs the pinned shadcn CLI and reads its fields', async () => {
    const calls: string[][] = [];
    const preset = await decodePreset('aCm3pr3s7', async (file, args) => {
      calls.push([file, ...args]);
      return output;
    });
    expect(calls).toEqual([['npx', '-y', `shadcn@${SHADCN_VERSION}`, 'preset', 'decode', 'aCm3pr3s7']]);
    expect(preset.fields['theme']).toBe('emerald');
    expect(preset.fields['baseColor']).toBe('zinc');
  });

  it('refuses output that decodes another code', async () => {
    await expect(decodePreset('other', async () => output)).rejects.toThrow('shadcn did not decode preset other');
  });
});
