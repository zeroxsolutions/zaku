import { z } from 'zod';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DesignFileInvalid, parseDesignFile, readOptionalDesignFile } from './design-file.js';

const schema = z.object({ name: z.string() }).strict();

describe('parseDesignFile', () => {
  it('names the file and the path of each issue', () => {
    expect(() => parseDesignFile('docs/design/zaku.yaml', 'name: 3\n', schema)).toThrow(
      'docs/design/zaku.yaml: name: Invalid input: expected string, received number',
    );
  });

  it('reports YAML that does not parse as an invalid file', () => {
    expect(() => parseDesignFile('a.yaml', 'name: [unclosed\n', schema)).toThrow(DesignFileInvalid);
  });

  it('parses a .json path as JSON', () => {
    expect(parseDesignFile('a.json', '{"name":"x"}', schema)).toEqual({ name: 'x' });
  });
});

describe('readOptionalDesignFile', () => {
  it('returns null for a file that does not exist', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'zaku-'));
    expect(await readOptionalDesignFile(join(dir, 'missing.json'), schema)).toBeNull();
  });

  it('reads a file that exists', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'zaku-'));
    await writeFile(join(dir, 'a.yaml'), 'name: x\n');
    expect(await readOptionalDesignFile(join(dir, 'a.yaml'), schema)).toEqual({ name: 'x' });
  });
});
