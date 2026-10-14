import { variablePartSchema } from '../domain/library.js';
import {
  exportVariables,
  libraryExportScript,
  type ExportOptions,
  type FigmaPluginApi,
} from './figma-variables-script.js';

function fakeFigma(pages: FigmaPluginApi[] = []): FigmaPluginApi {
  const value =
    (light: unknown, dark: unknown): ((consumer: { modes: Record<string, string> }) => { value: unknown }) =>
    (consumer) => ({ value: consumer.modes['C:sem'] === 'm:d' ? dark : light });
  const variables: Record<string, FigmaPluginApi> = {
    'VariableID:1:1': {
      id: 'VariableID:1:1',
      name: 'color/primary',
      resolveForConsumer: value({ r: 0, g: 0.4782, b: 0.3335, a: 1 }, { r: 0, g: 0.3777, b: 0.2706, a: 1 }),
    },
    'V:lg': { id: 'V:lg', name: 'radius/lg', resolveForConsumer: value(10, 10) },
    'V:axis': {
      id: 'V:axis',
      name: 'light/primary',
      resolveForConsumer: value({ r: 0, g: 0, b: 0, a: 1 }, { r: 0, g: 0, b: 0, a: 1 }),
    },
  };
  const collections = [
    {
      id: 'C:sem',
      name: 'semantic',
      modes: [
        { modeId: 'm:l', name: 'Light' },
        { modeId: 'm:d', name: 'Dark' },
      ],
      variableIds: ['VariableID:1:1', 'V:lg'],
    },
    {
      id: 'C:theme',
      name: 'theme',
      modes: [{ modeId: 't:e', name: 'emerald' }],
      variableIds: ['V:axis'],
    },
  ];
  const holder = {
    modes: {} as Record<string, string>,
    setExplicitVariableModeForCollection(collection: { id: string }, modeId: string): void {
      this.modes[collection.id] = modeId;
    },
    remove: (): void => undefined,
    x: 0,
    y: 0,
    name: '',
  };
  return {
    root: { children: pages },
    createFrame: () => holder,
    getLocalTextStylesAsync: async () => [
      {
        key: 'k-sm',
        name: 'typography/small',
        fontName: { family: 'Inter', style: 'Medium' },
        fontSize: 14,
      },
    ],
    variables: {
      getLocalVariableCollectionsAsync: async () => collections,
      getVariableByIdAsync: async (id: string) => variables[id] ?? null,
    },
  };
}

const options: ExportOptions = { combos: [{ theme: 'emerald' }] };

describe('exportVariables', () => {
  it('resolves every semantic token per combination in Light and Dark, colours as hex with alpha', async () => {
    const part = variablePartSchema.parse(await exportVariables(fakeFigma(), options));
    expect(part.tokens).toEqual([
      {
        combo: { theme: 'emerald', semantic: 'Light' },
        values: { 'color/primary': '#007a55ff', 'radius/lg': 10 },
      },
      {
        combo: { theme: 'emerald', semantic: 'Dark' },
        values: { 'color/primary': '#006045ff', 'radius/lg': 10 },
      },
    ]);
    expect(part.variables).toEqual({
      '1:1': 'color/primary',
      'V:lg': 'radius/lg',
      'V:axis': 'light/primary',
    });
    expect(part.textStyles[0]?.key).toBe('k-sm');
  });

  it("lists the file's own components with --local, each set once and no variant on its own, and none without it", async () => {
    const set = { id: '9:1', type: 'COMPONENT_SET', key: 'k-set', name: 'Badge', description: '', parent: null };
    const variant = { id: '9:2', type: 'COMPONENT', key: 'k-v', name: 'Variant=default', description: '', parent: set };
    const loose = { id: '9:3', type: 'COMPONENT', key: 'k-logo', name: 'Logo', description: 'mark', parent: null };
    let loaded = false;
    const page = {
      name: 'Badge',
      loadAsync: async (): Promise<void> => {
        loaded = true;
      },
      findAllWithCriteria: (): unknown[] => (loaded ? [set, variant, loose] : []),
    };
    const part = variablePartSchema.parse(await exportVariables(fakeFigma([page]), { ...options, local: true }));
    expect(part.components).toEqual([
      { id: '9:1', key: 'k-set', name: 'Badge', page: 'Badge', description: '', set: true },
      { id: '9:3', key: 'k-logo', name: 'Logo', page: 'Badge', description: 'mark', set: false },
    ]);
    expect(await exportVariables(fakeFigma([page]), options)).not.toHaveProperty('components');
  });

  it('refuses a mode the library does not have', async () => {
    await expect(exportVariables(fakeFigma(), { combos: [{ theme: 'indigo' }] })).rejects.toThrow(
      'no mode indigo in theme',
    );
  });
});

describe('libraryExportScript', () => {
  it('is self-contained: the serialized function runs with only the figma global', async () => {
    const AsyncFunction = Object.getPrototypeOf(async () => undefined).constructor as new (
      arg: string,
      body: string,
    ) => (figma: FigmaPluginApi) => Promise<unknown>;
    const run = new AsyncFunction('figma', libraryExportScript(options));
    expect(variablePartSchema.parse(await run(fakeFigma())).tokens).toHaveLength(2);
  });
});
