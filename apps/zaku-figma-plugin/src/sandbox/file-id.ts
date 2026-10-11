/** The plugin-data key the file's zaku id is kept under. */
export const FILE_ID_KEY = 'zaku-file-id';

/** What fileIdOf reads and writes: the document's own plugin data. */
export interface PluginDataHost {
  getPluginData(key: string): string;
  setPluginData(key: string, value: string): void;
}

/**
 * The file's zaku id, written the first time the plugin opens there. A public plugin cannot read the file's key,
 * and two new files are both named Untitled, so this id is how an agent names one. `random` is `Math.random`, since
 * the sandbox has no crypto.
 */
export function fileIdOf(root: PluginDataHost, random: () => number = Math.random): string {
  const kept = root.getPluginData(FILE_ID_KEY);
  if (kept) return kept;
  let id = '';
  while (id.length < 16) id += Math.floor(random() * 16).toString(16);
  root.setPluginData(FILE_ID_KEY, id);
  return id;
}
