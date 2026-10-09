import { zakuConfigSchema } from '../schema/zaku-config.js';
import { featureMapSchema, frameName, parseFrameName, qualify, resolveTargets } from './feature-map.js';

const config = zakuConfigSchema.parse({
  product: 'acme',
  designSystem: { shadcn: { preset: 'aCm3pr3s7' } },
  figma: { library: 'L', product: 'P' },
  targets: [
    { id: 'web-desktop', family: 'web', name: 'Desktop' },
    { id: 'web-mobile', family: 'web', name: 'Mobile' },
    { id: 'android-tablet', family: 'android', name: 'Android tablet' },
  ],
});

const screen = featureMapSchema.parse({
  feature: 'auth',
  screens: { 'sign-in': { title: 'Sign in', root: true, states: ['Default', 'Phone', 'Error'] } },
}).screens['sign-in']!;

describe('featureMapSchema', () => {
  it('requires Default as the first state', () => {
    const result = featureMapSchema.safeParse({
      feature: 'auth',
      screens: { a: { title: 'A', states: ['Error'] } },
    });
    expect(result.success).toBe(false);
  });

  it('refuses a state or a title with a slash, which separates the parts of a frame name', () => {
    expect(
      featureMapSchema.safeParse({
        feature: 'auth',
        screens: { a: { title: 'A', states: ['Default', 'On / off'] } },
      }).success,
    ).toBe(false);
    expect(
      featureMapSchema.safeParse({
        feature: 'auth',
        screens: { a: { title: 'A / B', states: ['Default'] } },
      }).success,
    ).toBe(false);
  });

  it('refuses an entry that names neither a screen nor a url', () => {
    const result = featureMapSchema.safeParse({
      feature: 'auth',
      screens: { a: { title: 'A', states: ['Default'], entry: [{ via: 'a tap' }] } },
    });
    expect(result.success).toBe(false);
  });

  it('defaults targets to all, and back, entry, exits and components to empty', () => {
    expect(screen.targets).toBe('all');
    expect(screen.back).toEqual({});
    expect(screen.entry).toEqual([]);
    expect(screen.components).toEqual([]);
  });
});

describe('resolveTargets', () => {
  it('takes every target for all, less the ones omits names', () => {
    const omitting = { ...screen, omits: { 'android-tablet': 'web only for now' } };
    expect(resolveTargets(omitting, config).targets.map((t) => t.id)).toEqual(['web-desktop', 'web-mobile']);
  });

  it('reports a target id the config does not declare', () => {
    expect(resolveTargets({ ...screen, targets: ['web-desktop', 'tv'] }, config).unknown).toEqual(['tv']);
  });
});

describe('frame names', () => {
  it('writes the title, the state and the target name, the default state included', () => {
    expect(frameName(config.targets[0]!, screen, 'Default')).toBe('Sign in / Default / Desktop');
    expect(frameName(config.targets[2]!, screen, 'Error')).toBe('Sign in / Error / Android tablet');
  });

  it('parses the names it writes back to the target, the title and the state', () => {
    expect(parseFrameName('Sign in / Error / Android tablet', config.targets)).toEqual({
      target: config.targets[2],
      title: 'Sign in',
      state: 'Error',
    });
  });

  it('returns null for a name whose last part is no declared target, or that has too few parts', () => {
    expect(parseFrameName('Sign in / Error / TV', config.targets)).toBeNull();
    expect(parseFrameName('Sign in / Desktop', config.targets)).toBeNull();
    expect(parseFrameName('D - Auth - Sign in', config.targets)).toBeNull();
  });
});

describe('qualify', () => {
  it('prefixes a bare screen id with the feature and leaves a qualified one alone', () => {
    expect(qualify('sign-up', 'auth')).toBe('auth/sign-up');
    expect(qualify('home/home', 'auth')).toBe('home/home');
  });
});
