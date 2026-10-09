import { copyIssues, copyPolicy } from './copy-rules.js';

const enVi = copyPolicy({ locales: ['en', 'vi'], currencies: ['VND', 'USD'] }, []);

describe('copyIssues, characters', () => {
  it('names the code point and the ASCII to write for an em dash and a curly apostrophe', () => {
    expect(copyIssues('A port \u2014 the town\u2019s houses', enVi)).toEqual([
      { field: 'characters', message: 'U+2014 em dash: write "-", or two sentences' },
      { field: 'characters', message: "U+2019 right single quotation mark: write '" },
    ]);
  });

  it('names an ellipsis, a middle dot, an arrow, a multiplication sign, invisible spaces and an emoji', () => {
    const text = 'Wait\u2026 Chat \u00b7 12 \u2190 Results \u21e8 2\u00d73 a\u00a0b c\u200bd\ufeff \u{1f30f}';
    expect(copyIssues(text, enVi).map((issue) => issue.message)).toEqual([
      'U+2026 horizontal ellipsis: write "..."',
      'U+00B7 middle dot: write "-", "," or ":"',
      'U+2190 leftwards arrow: write "<-"',
      'U+21E8 arrow: write "->" or "<-"',
      'U+00D7 multiplication sign: write "x"',
      'U+00A0 no-break space: write a space',
      'U+200B zero width space: write nothing',
      'U+FEFF zero width no-break space: write nothing',
      'U+1F30F emoji: write a word, or a library icon',
    ]);
  });

  it('reports a code point once in a text, however often it occurs', () => {
    expect(copyIssues('a \u2014 b \u2014 c', enVi)).toHaveLength(1);
  });

  it('allows the letters of a script a locale is written in, composed or not, and a currency symbol', () => {
    expect(copyIssues('Ph\u1ed1 c\u1ed5 H\u1ed9i An, 120.000 \u20ab', enVi)).toEqual([]);
    expect(copyIssues('Ph\u1ed1 c\u1ed5 H\u1ed9i An'.normalize('NFD'), enVi)).toEqual([]);
    expect(copyIssues('Line one\nline two\u2028line three', enVi)).toEqual([]);
  });

  it('reports a letter of a script no locale is written in, and a symbol of a currency not priced in', () => {
    expect(copyIssues('\u0416 \u20ac5', enVi)).toEqual([
      {
        field: 'characters',
        message:
          'U+0416 is outside the locales and currencies copy names in zaku.yaml: write it in ASCII, or add its locale or currency there',
      },
      {
        field: 'characters',
        message:
          'U+20AC is outside the locales and currencies copy names in zaku.yaml: write it in ASCII, or add its locale or currency there',
      },
    ]);
    const ru = copyPolicy({ locales: ['ru'], currencies: ['EUR'] }, []);
    expect(copyIssues('\u0416 \u20ac5', ru)).toEqual([]);
  });

  it('allows a character the library carries in its own components', () => {
    const carried = copyPolicy({ locales: ['en'], currencies: [] }, ['Next \u2192']);
    expect(copyIssues('Open the map \u2192', carried)).toEqual([]);
  });
});

describe('copyIssues, tone', () => {
  it('names the phrase and what to write instead, in any case and with either apostrophe', () => {
    expect(copyIssues("Let's delve into a vibrant town in order to leverage it", enVi)).toEqual([
      { field: 'tone', message: '"delve": write "look at" or "read"' },
      { field: 'tone', message: '"leverage": write "use"' },
      { field: 'tone', message: '"vibrant": write "busy", or what is there' },
      { field: 'tone', message: '"Let\'s": write the action itself, such as "Plan a trip"' },
      { field: 'tone', message: '"in order to": write "to"' },
    ]);
    expect(copyIssues('Let\u2019s go', enVi).filter((issue) => issue.field === 'tone')).toHaveLength(1);
  });

  it('finds the not-just-but frame across the words between its halves', () => {
    expect(copyIssues('Not just a town, but a museum you walk through.', enVi)).toEqual([
      { field: 'tone', message: '"Not just a town, but": write the second half on its own' },
    ]);
  });

  it('leaves a word that only contains a tell alone', () => {
    expect(copyIssues('Take the elevator to the robustas', enVi)).toEqual([]);
  });

  it('matches a list only when copy names its locale', () => {
    const vi = copyPolicy({ locales: ['vi'], currencies: [] }, []);
    expect(copyIssues('Delve into Hoi An', vi)).toEqual([]);
  });
});
