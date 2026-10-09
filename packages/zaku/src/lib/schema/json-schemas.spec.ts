import { designJsonSchemas } from './json-schemas.js';

describe('designJsonSchemas', () => {
  it('describes zaku.yaml, with the targets an editor completes', () => {
    const schema = designJsonSchemas()['zaku.schema.json'] as {
      properties: Record<string, unknown>;
      required: string[];
    };
    expect(Object.keys(schema.properties)).toEqual(
      expect.arrayContaining(['product', 'designSystem', 'figma', 'targets', 'modes', 'interactive', 'budget']),
    );
    expect(schema.required).toEqual(expect.arrayContaining(['product', 'designSystem', 'targets']));
    expect(schema.required).not.toContain('budget');
  });

  it('describes a feature map, whose screens an editor completes', () => {
    const schema = designJsonSchemas()['map.schema.json'] as { required: string[] };
    expect(schema.required).toEqual(['feature', 'screens']);
  });
});
