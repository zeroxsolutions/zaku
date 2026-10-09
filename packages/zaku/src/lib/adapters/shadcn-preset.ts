import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export interface DecodedPreset {
  code: string;
  fields: Record<string, string>;
}

export type RunCommand = (file: string, args: string[]) => Promise<string>;

export const SHADCN_VERSION = '4.21.3';

export const execRun: RunCommand = async (file, args) =>
  (await promisify(execFile)(file, args, { maxBuffer: 1_000_000 })).stdout;

export async function decodePreset(code: string, run: RunCommand): Promise<DecodedPreset> {
  const output = await run('npx', ['-y', `shadcn@${SHADCN_VERSION}`, 'preset', 'decode', code]);
  const fields: Record<string, string> = {};
  for (const line of output.split('\n')) {
    const [, key, value] = /^\s+([A-Za-z]+)\s+(\S.*)$/.exec(line) ?? [];
    if (key !== undefined && value !== undefined) fields[key] = value.trim();
  }
  if (fields['code'] !== code) throw new Error(`shadcn did not decode preset ${code}`);
  return { code, fields };
}
