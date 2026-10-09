import type { NodeSnapshot } from '../schema/bridge.js';
import { snapshotFindings } from './snapshot-rules.js';

const node = (patch: Partial<NodeSnapshot>): NodeSnapshot => ({
  id: '1:1',
  name: 'Card',
  type: 'FRAME',
  parentId: '0:1',
  frame: null,
  created: true,
  fills: [],
  strokes: [],
  textStyleId: null,
  instance: null,
  spacing: [],
  ...patch,
});

describe('snapshotFindings', () => {
  it('finds a fill and a stroke with no variable bound', () => {
    const findings = snapshotFindings([node({ fills: [{ bound: false }], strokes: [{ bound: false }] })]);
    expect(findings.map((f) => [f.check, f.field])).toEqual([
      ['binding', 'fill'],
      ['binding', 'stroke'],
    ]);
  });

  it('names the top-level frame the layer sits in, where it has one', () => {
    expect(snapshotFindings([node({ fills: [{ bound: false }], frame: 'Trips / Desktop' })])[0]).toMatchObject({
      frame: 'Trips / Desktop',
    });
    expect(snapshotFindings([node({ fills: [{ bound: false }] })])[0]).not.toHaveProperty('frame');
  });

  it('passes bound paints', () => {
    expect(snapshotFindings([node({ fills: [{ bound: true }] })])).toEqual([]);
  });

  it('finds a text with no style, and passes mixed styles', () => {
    expect(snapshotFindings([node({ type: 'TEXT', name: 'Title', textStyleId: null })])[0]).toMatchObject({
      check: 'binding',
      field: 'textStyle',
    });
    expect(snapshotFindings([node({ type: 'TEXT', name: 'Title', textStyleId: 'mixed' })])).toEqual([]);
  });

  it('finds a padding or gap with no variable bound, and passes zero', () => {
    const findings = snapshotFindings([
      node({
        spacing: [
          { field: 'paddingTop', value: 12, bound: false },
          { field: 'itemSpacing', value: 0, bound: false },
          { field: 'paddingLeft', value: 16, bound: true },
        ],
      }),
    ]);
    expect(findings.map((f) => f.field)).toEqual(['paddingTop']);
  });

  it('finds an override outside what a product frame may change', () => {
    const instance = {
      overrides: [{ nodeId: '1:1;2:3', fields: ['fills', 'characters'] }],
      sizing: { horizontal: 'FIXED', vertical: 'HUG' },
    };
    const findings = snapshotFindings([node({ type: 'INSTANCE', name: 'Button', instance })]);
    expect(findings).toEqual([expect.objectContaining({ check: 'overrides', nodeId: '1:1;2:3', field: 'fills' })]);
  });

  it('lets an instance be stretched when it is not fixed on that axis', () => {
    const instance = {
      overrides: [{ nodeId: '1:1', fields: ['width', 'height'] }],
      sizing: { horizontal: 'FILL', vertical: 'FIXED' },
    };
    const findings = snapshotFindings([node({ id: '1:1', type: 'INSTANCE', name: 'Button', instance })]);
    expect(findings.map((f) => f.field)).toEqual(['height']);
  });

  it('finds a default layer name, but not on a text, which is named for its copy', () => {
    expect(snapshotFindings([node({ name: 'Frame 12' })])[0]).toMatchObject({ check: 'naming' });
    expect(snapshotFindings([node({ type: 'TEXT', name: 'Rectangle', textStyleId: 's' })])).toEqual([]);
  });

  it('lets a picture be placed in an instance, as zaku check does', () => {
    const instance = {
      overrides: [{ nodeId: '1:1;2:9', fields: ['fills'], picture: true }],
      sizing: { horizontal: 'FIXED', vertical: 'FIXED' },
    };
    expect(snapshotFindings([node({ type: 'INSTANCE', name: 'Avatar', instance })])).toEqual([]);
  });
});
