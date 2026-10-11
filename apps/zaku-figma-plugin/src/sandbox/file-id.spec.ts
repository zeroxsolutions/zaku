import { FILE_ID_KEY, fileIdOf } from './file-id.js';

describe('fileIdOf', () => {
  const root = (): {
    data: Map<string, string>;
    getPluginData(k: string): string;
    setPluginData(k: string, v: string): void;
  } => {
    const data = new Map<string, string>();
    return {
      data,
      getPluginData: (key) => data.get(key) ?? '',
      setPluginData: (key, value) => void data.set(key, value),
    };
  };

  it('writes an id into the file once, and reads the same id when the plugin opens there again', () => {
    const file = root();
    let draws = 0;
    const random = (): number => (draws++, 0.5);
    const first = fileIdOf(file, random);
    expect(first).toMatch(/^[0-9a-f]{16}$/);
    expect(file.data.get(FILE_ID_KEY)).toBe(first);
    const drawn = draws;
    expect(fileIdOf(file, random)).toBe(first);
    expect(draws).toBe(drawn);
  });
});
