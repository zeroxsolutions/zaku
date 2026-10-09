import { testConfig, testInput, testLibrary, testTokens } from '../../../test/fixtures.fixture.js';
import { parseCssColour } from '../colour.js';
import type { Rgba } from '../library.js';
import { contrast, tokensCheck } from './tokens.js';

const modes = testConfig().modes;

function colours(values: Record<string, string>): Record<string, Rgba> {
  return Object.fromEntries(
    Object.entries(values).map(([name, css]) => [`color/${name}`, parseCssColour(css) as Rgba]),
  );
}

const libraryWith = (light: Record<string, string>, dark: Record<string, string>): ReturnType<typeof testLibrary> =>
  testLibrary({
    tokens: [
      { combo: { ...modes, semantic: 'Light' }, values: { ...colours(light), 'radius/lg': 10 } },
      { combo: { ...modes, semantic: 'Dark' }, values: { ...colours(dark), 'radius/lg': 10 } },
    ],
  });

describe('tokensCheck', () => {
  it('does not run without both the snapshot and the token document', () => {
    expect(tokensCheck(testInput())).toEqual({ notRun: 'library.json or tokens.json is missing' });
  });

  it('passes a library that resolves every token to the code value in both schemes', () => {
    const tokens = testTokens({ primary: '#007a55' }, { primary: '#006045' });
    expect(
      tokensCheck(testInput({ tokens, library: libraryWith({ primary: '#007a55' }, { primary: '#006045' }) })),
    ).toEqual({ findings: [] });
  });

  it('reports a token the library resolves differently, naming both values and the scheme', () => {
    const tokens = testTokens({ primary: '#007a55' }, { primary: '#006045' });
    expect(
      tokensCheck(testInput({ tokens, library: libraryWith({ primary: '#432dd7' }, { primary: '#006045' }) })),
    ).toEqual({
      findings: [
        {
          check: 'tokens',
          field: 'color/primary',
          message: 'color/primary is #432dd7 in the library and #007a55 in code (Light)',
        },
      ],
    });
  });
});

describe('contrast', () => {
  it('reports a text pair under 4.5:1 in a scheme, and a project token on the background', () => {
    const light = {
      foreground: '#09090b',
      background: '#ffffff',
      'muted-foreground': '#d4d4d8',
      muted: '#f4f4f5',
      warning: '#fcd34d',
    };
    const outcome = contrast(testInput({ tokens: testTokens(light, light, ['warning']) }));
    expect(outcome).toEqual({
      findings: [
        {
          check: 'contrast',
          field: 'muted-foreground/background',
          message: 'muted-foreground on background is 1.48:1 in light, under 4.5:1',
        },
        {
          check: 'contrast',
          field: 'muted-foreground/muted',
          message: 'muted-foreground on muted is 1.34:1 in light, under 4.5:1',
        },
        {
          check: 'contrast',
          field: 'warning/background',
          message: 'warning on background is 1.44:1 in light, under 4.5:1',
        },
        {
          check: 'contrast',
          field: 'muted-foreground/background',
          message: 'muted-foreground on background is 1.48:1 in dark, under 4.5:1',
        },
        {
          check: 'contrast',
          field: 'muted-foreground/muted',
          message: 'muted-foreground on muted is 1.34:1 in dark, under 4.5:1',
        },
        {
          check: 'contrast',
          field: 'warning/background',
          message: 'warning on background is 1.44:1 in dark, under 4.5:1',
        },
      ],
    });
  });
});

describe('contrast, on a design system that ships DTCG tokens', () => {
  const dtcg = (contrastPairs: [string, string][]): ReturnType<typeof testConfig> =>
    testConfig({
      designSystem: { dtcg: { light: ['t.json'], dark: ['t.json'], contrast: contrastPairs } },
    });

  it('checks the pairs zaku.yaml names, by their token paths', () => {
    const tokens = testTokens({
      text: '#777777',
      surface: '#ffffff',
      'brand/on': '#ffffff',
      'brand/fill': '#007a55',
    });
    const outcome = contrast(
      testInput({
        config: dtcg([
          ['color.text', 'color.surface'],
          ['color.brand.on', 'color.brand.fill'],
        ]),
        tokens,
      }),
    );
    expect(outcome).toEqual({
      findings: [
        {
          check: 'contrast',
          field: 'color.text/color.surface',
          message: 'color.text on color.surface is 4.48:1 in light, under 4.5:1',
        },
        {
          check: 'contrast',
          field: 'color.text/color.surface',
          message: 'color.text on color.surface is 4.48:1 in dark, under 4.5:1',
        },
      ],
    });
  });

  it('does not run when zaku.yaml names no pair, rather than pass on nothing', () => {
    expect(contrast(testInput({ config: dtcg([]), tokens: testTokens({ text: '#000000' }) }))).toEqual({
      notRun: 'zaku.yaml names no contrast pairs for the design system (designSystem.dtcg.contrast)',
    });
  });

  it('reports a pair that names a token the design system does not have', () => {
    const outcome = contrast(
      testInput({
        config: dtcg([['color.text', 'color.paper']]),
        tokens: testTokens({ text: '#000000' }),
      }),
    );
    expect(outcome).toEqual({
      findings: [
        {
          check: 'contrast',
          field: 'color.text/color.paper',
          message: 'color.paper is not a colour role of the design system',
        },
      ],
    });
  });
});
