import { buttonViews, documentationComponents, pageSnapshot } from '../../test/documentation.fixture.js';
import { snapshotFindings } from './snapshot-rules.js';

const DOCS = { id: '3:16', name: 'Component for Docs' };
const BUTTON = { id: '0:1', name: '\u2756 Button' };

const documentation = (nodes: Parameters<typeof snapshotFindings>[0]): string[] =>
  snapshotFindings(nodes)
    .filter((finding) => finding.check === 'documentation')
    .map((finding) => finding.message);

describe('the documentation rule', () => {
  it("passes the measured library's documentation components clean, in either family's spelling of a weight", () => {
    expect(documentation(pageSnapshot(DOCS, documentationComponents()))).toEqual([]);
    expect(documentation(pageSnapshot(DOCS, documentationComponents({ family: 'Roboto' })))).toEqual([]);
  });

  it("passes the measured library's two Button views clean", () => {
    expect(documentation(pageSnapshot(BUTTON, buttonViews()))).toEqual([]);
  });

  it("finds a section heading set in the library's own text styles, not the documentation's type", () => {
    const drawn = documentationComponents({ family: 'Roboto', sectionTitle: [30, 38], sectionDescription: [16, 24] });
    expect(documentation(pageSnapshot(DOCS, drawn))).toEqual(
      expect.arrayContaining([
        'DS/Section Heading / h2 / Title: is set 30 / 38, not 30 / 36',
        'DS/Section Heading / Description: is set 16 / 24, not 16 / 28',
      ]),
    );
  });

  it('finds a matrix head set as a table head, filling the width', () => {
    const drawn = documentationComponents({
      matrixText: { size: 14, lineHeight: 20, style: 'Medium', sizing: 'FILL' },
    });
    expect(documentation(pageSnapshot(DOCS, drawn))).toEqual([
      'DS/Matrix Head / Text: sizes FILL horizontally, not HUG',
      'DS/Matrix Head / Text: is set 14 / 20, not 12 / 16',
    ]);
  });

  it("finds the header's badge row left at the size Figma gives a new frame", () => {
    const drawn = documentationComponents({
      badges: { width: 100, height: 100, sizing: { horizontal: 'FIXED', vertical: 'FIXED' } },
    });
    expect(documentation(pageSnapshot(DOCS, drawn))).toEqual([
      'DS/Header / Title block / Badges: sizes FIXED horizontally, not HUG',
      'DS/Header / Title block / Badges: sizes FIXED vertically, not HUG',
    ]);
  });

  it('finds a second component of a documentation name, and its missing properties', () => {
    expect(documentation(pageSnapshot(DOCS, documentationComponents({ leftover: true })))).toEqual(
      expect.arrayContaining([
        'DS/Section Heading: a second component of that name',
        expect.stringMatching(/^DS\/Section Heading: has the properties \[\], not \[/),
      ]),
    );
  });

  it('finds a component on the page that is not a documentation component', () => {
    const page = [...documentationComponents(), { name: 'DS/Badge', type: 'COMPONENT' }];
    expect(documentation(pageSnapshot(DOCS, page))).toEqual(['DS/Badge: is not one of the documentation components']);
  });

  it('finds a documentation component missing a layer the documentation names', () => {
    const [header, ...rest] = documentationComponents();
    const page = [{ ...header!, children: header!.children!.filter((layer) => layer.name !== 'Description') }, ...rest];
    expect(documentation(pageSnapshot(DOCS, page))).toEqual(['DS/Header: holds no Description']);
  });

  it("finds a view's body, list and cards drawn to other measures", () => {
    const [component, guidance] = buttonViews();
    const body = guidance!.children![1]!;
    body.box = { ...body.box, padding: [40, 120, 96, 120] };
    const usage = body.children!.find((layer) => layer.name === 'Usage')!;
    usage.children![1]!.box = { ...usage.children![1]!.box, gap: 12 };
    expect(documentation(pageSnapshot(BUTTON, [component!, guidance!]))).toEqual([
      'Nova / Button / Guidance / Body: padding 40 120 96 120, not 48 120 96 120',
      'Nova / Button / Guidance / Body / Usage / List: gap 12, not 8',
    ]);
  });

  it('reads nothing off the documentation, and nothing whose layers above it the snapshot lacks', () => {
    const other = pageSnapshot(
      { id: '9:1', name: 'Trips' },
      documentationComponents({ matrixText: { size: 9, lineHeight: 9, style: 'Bold', sizing: 'FILL' } }),
    );
    expect(documentation(other)).toEqual([]);
    const lone = pageSnapshot(DOCS, documentationComponents({ sectionTitle: [10, 10] })).filter(
      (node) => node.name === 'Title' && node.font?.size === 10,
    );
    expect(documentation(lone)).toEqual([]);
  });
});
