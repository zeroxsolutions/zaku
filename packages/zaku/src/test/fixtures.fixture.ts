import { zakuConfigSchema, type ZakuConfig } from '../lib/schema/zaku-config.js';
import { digestOf, type LoadedMap } from '../lib/repositories/feature-maps.js';
import { featureMapSchema, type FeatureMap } from '../lib/domain/feature-map.js';
import type { CheckInput } from '../lib/domain/findings.js';
import type { LibraryItem, LibrarySnapshot } from '../lib/domain/library.js';
import type { FrameOutline, InstanceOutline, ScreenOutline } from '../lib/domain/outline.js';
import { parseCssColour, toHex } from '../lib/domain/colour.js';
import type { TokenDocument, TokenSet } from '../lib/domain/token-document.js';

export function testConfig(extra: Partial<Record<keyof ZakuConfig, unknown>> = {}): ZakuConfig {
  return zakuConfigSchema.parse({
    product: 'acme',
    designSystem: { shadcn: { preset: 'aCm3pr3s7' } },
    figma: { library: 'LIB', product: 'PROD' },
    targets: [
      { id: 'web-desktop', family: 'web', name: 'Desktop' },
      { id: 'ios-phone', family: 'ios', name: 'iPhone' },
    ],
    modes: {
      'base-color': 'zinc',
      theme: 'emerald',
      chart: 'purple',
      'menu-accent': 'subtle',
      radius: 'default',
      typography: 'inter',
      project: 'acme',
    },
    ...extra,
  });
}

export function testMap(feature: string, screens: Record<string, unknown>): FeatureMap {
  return featureMapSchema.parse({ feature, screens });
}

export function loadedMap(map: FeatureMap): LoadedMap {
  return {
    path: `docs/design/map/${map.feature}.yaml`,
    digest: digestOf(JSON.stringify(map)),
    map,
  };
}

export function testInput(extra: Partial<CheckInput> = {}): CheckInput {
  return {
    config: testConfig(),
    maps: [],
    outlines: [],
    unmapped: [],
    library: null,
    tokens: null,
    recipe: null,
    ...extra,
  };
}

export function testInstance(extra: Partial<InstanceOutline> = {}): InstanceOutline {
  return {
    nodeId: '10:1',
    component: 'Button',
    componentKey: 'button-default',
    variant: 'Variant=default, Size=default',
    properties: { Variant: 'default', Size: 'default' },
    swaps: [],
    overrides: [],
    nested: [],
    texts: [{ nodeId: '10:2', path: 'Label', characters: 'Save trip' }],
    interactive: true,
    local: false,
    bounds: { x: 0, y: 0, width: 80, height: 32 },
    sizing: { horizontal: 'HUG', vertical: 'FIXED' },
    ...extra,
  };
}

export function testFrame(extra: Partial<FrameOutline> = {}): FrameOutline {
  return {
    nodeId: '1:1',
    name: 'Trips / Default / Desktop',
    target: 'web-desktop',
    state: 'Default',
    size: { width: 1440, height: 900 },
    containers: ['Trips', 'Default'],
    start: false,
    instances: [],
    texts: [],
    raw: [],
    images: [],
    defaultNames: [],
    links: [],
    ...extra,
  };
}

export function testOutline(extra: Partial<ScreenOutline> = {}): ScreenOutline {
  return {
    feature: 'trips',
    screen: 'trips',
    source: 'PROD',
    fileVersion: '1',
    mapDigest: 'd',
    libraryVersion: 'v1',
    frames: [],
    ...extra,
  };
}

export function testItem(extra: Partial<LibraryItem> = {}): LibraryItem {
  return {
    nodeId: '100:1',
    path: '',
    type: 'INSTANCE',
    fill: { r: 0, g: 0.4782, b: 0.3335, a: 1 },
    stroke: null,
    textColor: null,
    width: 80,
    height: 32,
    padding: [0, 10, 0, 10],
    gap: 6,
    radii: [8, 8, 8, 8],
    strokeWeights: null,
    fontSize: null,
    fontFamily: null,
    textStyleKey: null,
    componentKey: 'button-default',
    bindings: { fill: 'color/primary', stroke: null, textColor: null, radius: 'radius/lg' },
    ...extra,
  };
}

export function testLibrary(extra: Partial<LibrarySnapshot> = {}): LibrarySnapshot {
  return {
    source: 'LIB',
    version: 'v1',
    exportedAt: '2026-10-07T00:00:00.000Z',
    components: [
      {
        name: 'Button',
        key: 'button-set',
        page: 'Button',
        codePath: 'components/ui/button.tsx',
        map: { props: { Variant: 'variant', Size: 'size' }, parts: { Label: 'label' } },
        variants: [
          {
            key: 'button-default',
            name: 'Variant=default, Size=default',
            props: { Variant: 'default', Size: 'default' },
            modes: [
              {
                combo: { semantic: 'Light' },
                items: [
                  testItem(),
                  testItem({
                    nodeId: '100:2',
                    path: 'Label',
                    type: 'TEXT',
                    fill: null,
                    textColor: { r: 0.9243, g: 0.992, b: 0.9602, a: 1 },
                    padding: null,
                    gap: null,
                    radii: null,
                    fontSize: 14,
                    fontFamily: 'Inter',
                    textStyleKey: 'style-sm',
                    componentKey: null,
                    bindings: { textColor: 'color/primary-foreground' },
                  }),
                  testItem({
                    nodeId: '100:3',
                    path: 'Icon',
                    componentKey: 'icon-plus',
                    fill: null,
                    padding: null,
                    gap: null,
                    radii: null,
                    bindings: {},
                  }),
                ],
              },
            ],
          },
        ],
      },
    ],
    textStyles: [
      {
        key: 'style-sm',
        name: 'typography/small',
        fontFamily: 'Inter',
        fontStyle: 'Medium',
        fontSize: 14,
      },
    ],
    tokens: [],
    ...extra,
  };
}

export function testTokens(
  light: Record<string, string>,
  dark: Record<string, string> = light,
  projectTokens: readonly string[] = [],
): TokenDocument {
  const set = (values: Record<string, string>): TokenSet => ({
    color: Object.fromEntries(
      Object.entries(values).map(([name, css]) => {
        const c = parseCssColour(css) ?? { r: 0, g: 0, b: 0, a: 1 };
        const axis = projectTokens.includes(name) ? ('project' as const) : ('base-color' as const);
        return [
          name,
          {
            $type: 'color' as const,
            $value: {
              colorSpace: 'srgb' as const,
              components: [c.r, c.g, c.b] as [number, number, number],
              alpha: c.a,
              hex: toHex(c),
            },
            $extensions: { 'com.zeroxsolutions.zaku': { axis, source: css } },
          },
        ];
      }),
    ),
    radius: {
      lg: {
        $type: 'dimension',
        $value: { value: 10, unit: 'px' },
        $extensions: { 'com.zeroxsolutions.zaku': { axis: 'radius', source: '0.625rem' } },
      },
    },
  });
  return {
    $schema: 'https://www.designtokens.org/schemas/2025.10/resolver.json',
    version: '2025.10',
    name: 'aCm3pr3s7',
    description: 'test',
    modifiers: {
      scheme: { contexts: { light: [set(light)], dark: [set(dark)] }, default: 'light' },
    },
    resolutionOrder: [{ $ref: '#/modifiers/scheme' }],
  };
}
