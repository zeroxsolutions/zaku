import { createFigmaRest } from './figma-rest.js';
import type { VariablePart } from '../domain/library.js';
import { readLibrary } from './figma-rest-library.js';

const part: VariablePart = {
  exportedAt: '2026-10-07T00:00:00.000Z',
  variables: {
    '1:5': 'color/primary',
    'V:fg': 'color/primary-foreground',
    'V:4xl': 'radius/4xl',
    'V:sub': 'mode/destructive-subtle',
  },
  textStyles: [
    {
      key: 'k-sm',
      name: 'typography/small',
      fontFamily: 'Inter',
      fontStyle: 'Medium',
      fontSize: 14,
    },
  ],
  tokens: [
    {
      combo: { semantic: 'Light' },
      values: {
        'color/primary': '#007a55ff',
        'color/primary-foreground': '#ecfdf5ff',
        'radius/4xl': 26,
        'mode/destructive-subtle': '#e7000b1a',
      },
    },
    {
      combo: { semantic: 'Dark' },
      values: {
        'color/primary': '#006045ff',
        'color/primary-foreground': '#ecfdf5ff',
        'radius/4xl': 26,
        'mode/destructive-subtle': '#ff646a0a',
      },
    },
  ],
};

const set = {
  id: '1:1',
  name: 'Badge',
  type: 'COMPONENT_SET',
  children: [
    {
      id: '1:2',
      name: 'Variant=default',
      type: 'COMPONENT',
      absoluteBoundingBox: { x: 0, y: 0, width: 53, height: 20 },
      layoutMode: 'HORIZONTAL',
      paddingTop: 2,
      paddingRight: 8,
      paddingBottom: 2,
      paddingLeft: 8,
      itemSpacing: 4,
      cornerRadius: 26,
      boundVariables: {
        rectangleCornerRadii: Object.fromEntries(
          ['TOP_LEFT', 'TOP_RIGHT', 'BOTTOM_LEFT', 'BOTTOM_RIGHT'].map((corner) => [
            `RECTANGLE_${corner}_CORNER_RADIUS`,
            { type: 'VARIABLE_ALIAS', id: 'V:4xl' },
          ]),
        ),
      },
      fills: [
        {
          type: 'SOLID',
          color: { r: 0, g: 0, b: 0, a: 1 },
          boundVariables: { color: { type: 'VARIABLE_ALIAS', id: 'VariableID:1:5' } },
        },
      ],
      children: [
        {
          id: '1:3',
          name: 'Label',
          type: 'TEXT',
          absoluteBoundingBox: { x: 8, y: 2, width: 37, height: 16 },
          style: { fontFamily: 'Inter', fontSize: 12 },
          fills: [
            {
              type: 'SOLID',
              color: { r: 1, g: 1, b: 1, a: 1 },
              boundVariables: { color: { type: 'VARIABLE_ALIAS', id: 'V:fg' } },
            },
          ],
        },
        {
          id: '1:6',
          name: 'Icon',
          type: 'INSTANCE',
          componentId: '7:1',
          absoluteBoundingBox: { x: 40, y: 4, width: 12, height: 12 },
          fills: [],
          children: [
            {
              id: 'I1:6;7:2',
              name: 'Vector',
              type: 'VECTOR',
              absoluteBoundingBox: { x: 41, y: 5, width: 10, height: 10 },
              fills: [],
              strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 } }],
            },
          ],
        },
      ],
    },
    {
      id: '1:4',
      name: 'Variant=destructive',
      type: 'COMPONENT',
      absoluteBoundingBox: { x: 0, y: 30, width: 53, height: 20 },
      opacity: 1,
      cornerRadius: 26,
      boundVariables: {
        rectangleCornerRadii: {
          RECTANGLE_TOP_LEFT_CORNER_RADIUS: { type: 'VARIABLE_ALIAS', id: 'V:4xl' },
        },
      },
      fills: [
        {
          type: 'SOLID',
          opacity: 0.1,
          color: { r: 0.9, g: 0, b: 0, a: 1 },
          boundVariables: { color: { type: 'VARIABLE_ALIAS', id: 'V:sub' } },
        },
      ],
      children: [],
    },
  ],
};

function fakeFetch(): typeof fetch {
  return async (url) => {
    const href = String(url);
    const body = href.endsWith('/component_sets')
      ? {
          meta: {
            component_sets: [
              {
                node_id: '1:1',
                key: 'ks-badge',
                name: 'Badge',
                description: 'code: components/ui/badge.tsx\nprops: Variant=variant',
                containing_frame: { pageName: '❖ Badge' },
              },
            ],
          },
        }
      : href.endsWith('/components')
        ? {
            meta: {
              components: [
                {
                  node_id: '1:2',
                  key: 'k-default',
                  name: 'Variant=default',
                  description: '',
                  containing_frame: { containingComponentSet: { nodeId: '1:1' } },
                },
                {
                  node_id: '9:1',
                  key: 'k-header',
                  name: 'DS/Header',
                  description: '',
                  containing_frame: {},
                },
              ],
            },
          }
        : href.includes('/nodes?')
          ? {
              version: '77',
              nodes: {
                '1:1': {
                  document: set,
                  components: {
                    '1:2': { key: 'k-default', name: 'Variant=default' },
                    '1:4': { key: 'k-destructive', name: 'Variant=destructive' },
                  },
                  componentSets: {},
                  styles: {},
                },
              },
            }
          : {
              version: '77',
              document: { id: '0:0', name: 'D', type: 'DOCUMENT', children: [] },
              components: {},
              componentSets: {},
              styles: {},
            };
    return new Response(JSON.stringify(body), { status: 200 });
  };
}

describe('readLibrary', () => {
  it('reads each published set over REST and resolves its items per combination from the exported variables', async () => {
    const snapshot = await readLibrary({
      rest: createFigmaRest({ token: 't', fetch: fakeFetch() }),
      fileKey: 'LIB',
      part,
    });
    expect(snapshot).toMatchObject({ source: 'LIB', version: '77' });
    expect(snapshot.components.map((component) => [component.name, component.page, component.codePath])).toEqual([
      ['Badge', 'Badge', 'components/ui/badge.tsx'],
    ]);
    const [light, dark] = snapshot.components[0]?.variants[0]?.modes ?? [];
    expect(light?.items[0]).toMatchObject({
      path: '',
      fill: { r: 0, g: 0.4784, b: 0.3333, a: 1 },
      padding: [2, 8, 2, 8],
      gap: 4,
      radii: [26, 26, 26, 26],
      componentKey: 'k-default',
      bindings: { fill: 'color/primary', radius: 'radius/4xl' },
    });
    expect(light?.items[1]).toMatchObject({
      path: 'Label',
      textColor: { r: 0.9255, g: 0.9922, b: 0.9608, a: 1 },
      fontSize: 12,
      bindings: { textColor: 'color/primary-foreground' },
    });
    expect(dark?.items[0]?.fill).toEqual({ r: 0, g: 0.3765, b: 0.2706, a: 1 });
    expect(snapshot.tokens[0]?.values['radius/4xl']).toBe(26);
  });

  it('reads the colour an icon instance draws its glyph in, which its own frame does not carry', async () => {
    const snapshot = await readLibrary({
      rest: createFigmaRest({ token: 't', fetch: fakeFetch() }),
      fileKey: 'LIB',
      part,
    });
    const icon = snapshot.components[0]?.variants[0]?.modes[0]?.items.find((item) => item.path === 'Icon');
    expect(icon).toMatchObject({ glyph: { r: 0, g: 0, b: 0, a: 1 }, bindings: { glyph: null } });
    expect(snapshot.components[0]?.variants[0]?.modes[0]?.items[1]).not.toHaveProperty('glyph');
  });

  it('takes a bound paint alpha from the token alone, not again from the paint opacity', async () => {
    const snapshot = await readLibrary({
      rest: createFigmaRest({ token: 't', fetch: fakeFetch() }),
      fileKey: 'LIB',
      part,
    });
    expect(snapshot.components[0]?.variants[1]?.modes[0]?.items[0]?.fill?.a).toBe(0.102);
  });

  it('names a radius binding only when all four corners share it', async () => {
    const snapshot = await readLibrary({
      rest: createFigmaRest({ token: 't', fetch: fakeFetch() }),
      fileKey: 'LIB',
      part,
    });
    expect(snapshot.components[0]?.variants[1]?.modes[0]?.items[0]?.bindings['radius']).toBeNull();
  });
});
