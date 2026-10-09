import { buildRecipe, type RawPart } from './build-recipe.js';

function part(extra: Partial<RawPart>): RawPart {
  return {
    root: 0,
    component: 'Button',
    props: '{"variant":"outline","size":"sm"}',
    part: 'root',
    background: 'rgba(0, 0, 0, 0)',
    color: 'rgb(9, 9, 11)',
    borderColor: 'rgb(228, 228, 231)',
    borderWidths: [1, 1, 1, 1],
    width: 72,
    height: 32,
    padding: [0, 10, 0, 10],
    gap: '6px',
    radii: ['8px', '8px', '8px', '8px'],
    fontSize: 14,
    fontFamily: '"Geist", sans-serif',
    ...extra,
  };
}

describe('buildRecipe', () => {
  it('groups the parts each scheme read into variants of their component', () => {
    const doc = buildRecipe({
      light: [part({}), part({ part: 'label', borderWidths: [0, 0, 0, 0], gap: 'normal' })],
      dark: [part({ background: 'oklch(0.274 0.006 286.033)' })],
    });
    expect(doc.components).toHaveLength(1);
    const [light, dark] = doc.components[0]?.variants ?? [];
    expect(light).toMatchObject({ props: { variant: 'outline', size: 'sm' }, scheme: 'light' });
    expect(light?.parts['root']).toEqual({
      background: null,
      color: { r: 0.0353, g: 0.0353, b: 0.0431, a: 1 },
      borderColor: { r: 0.8941, g: 0.8941, b: 0.9059, a: 1 },
      borderWidths: [1, 1, 1, 1],
      width: 72,
      height: 32,
      padding: [0, 10, 0, 10],
      gap: 6,
      radii: [8, 8, 8, 8],
      fontSize: 14,
      fontFamily: '"Geist", sans-serif',
    });
    expect(light?.parts['label']).toMatchObject({ borderColor: null, gap: null });
    expect(dark).toMatchObject({ scheme: 'dark' });
    expect(dark?.parts['root']?.background?.a).toBe(1);
  });

  it('refuses props that are not a JSON object of strings, naming the component', () => {
    expect(() => buildRecipe({ light: [part({ props: '{variant:outline}' })], dark: [] })).toThrow(
      'Button: data-zaku-props is not a JSON object of strings: {variant:outline}',
    );
  });

  it('refuses a variant rendered twice', () => {
    expect(() => buildRecipe({ light: [part({ root: 0 }), part({ root: 1 })], dark: [] })).toThrow(
      'Button variant=outline, size=sm is rendered twice in light',
    );
  });

  it('refuses a colour it cannot read, naming the part and field', () => {
    expect(() => buildRecipe({ light: [part({ part: 'label', color: 'lab(50 20 30)' })], dark: [] })).toThrow(
      'Button variant=outline, size=sm, part label: color is lab(50 20 30), which zaku does not read',
    );
  });
});

function root(
  extra: Partial<RawPart>,
): ReturnType<typeof buildRecipe>['components'][number]['variants'][number]['parts'][string] | undefined {
  return buildRecipe({ light: [part(extra)], dark: [part(extra)] }).components[0]?.variants[0]?.parts['root'];
}

describe('buildRecipe radii', () => {
  it('reads a percentage radius as a fraction of the shorter side', () => {
    expect(root({ width: 32, height: 32, radii: ['50%', '50%', '50%', '50%'] })?.radii).toEqual([16, 16, 16, 16]);
  });

  it('scales radii that overlap down until adjacent corners fit, as CSS does', () => {
    expect(root({ width: 80, height: 32, radii: ['9999px', '9999px', '9999px', '9999px'] })?.radii).toEqual([
      16, 16, 16, 16,
    ]);
  });

  it('keeps each corner its own, so a header rounded only on top reads as such', () => {
    expect(root({ width: 200, height: 48, radii: ['8px', '8px', '0px', '0px'] })?.radii).toEqual([8, 8, 0, 0]);
  });
});

describe('buildRecipe borders', () => {
  it('keeps each side its own width, and takes the colour from a side that is drawn', () => {
    const read = root({ borderWidths: [0, 0, 1, 0], borderColor: 'rgb(229, 229, 229)' });
    expect(read?.borderWidths).toEqual([0, 0, 1, 0]);
    expect(read?.borderColor).not.toBeNull();
  });

  it('has no border colour when no side is drawn', () => {
    expect(root({ borderWidths: [0, 0, 0, 0] })?.borderColor).toBeNull();
  });
});
