import { readFile, rename, writeFile } from 'node:fs/promises';
import { parse } from 'yaml';
import type { z } from 'zod';
import { DesignFileInvalid } from '../domain/errors/design-file-invalid.js';

export { DesignFileInvalid };

export function parseDesignFile<S extends z.ZodType>(path: string, text: string, schema: S): z.output<S> {
  let data: unknown;
  try {
    data = path.endsWith('.json') ? JSON.parse(text) : parse(text);
  } catch (error) {
    throw new DesignFileInvalid(path, [(error as Error).message]);
  }
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new DesignFileInvalid(
      path,
      result.error.issues.map((issue) => `${issue.path.map(String).join('.') || '(root)'}: ${issue.message}`),
    );
  }
  return result.data;
}

export async function readDesignFile<S extends z.ZodType>(path: string, schema: S): Promise<z.output<S>> {
  return parseDesignFile(path, await readFile(path, 'utf8'), schema);
}

export async function readOptionalDesignFile<S extends z.ZodType>(
  path: string,
  schema: S,
): Promise<z.output<S> | null> {
  let text: string;
  try {
    text = await readFile(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
  return parseDesignFile(path, text, schema);
}

/** Writes beside the target and renames over it, so a crash leaves the previous document whole. */
export async function writeDesignFile(path: string, value: unknown): Promise<void> {
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporary, path);
}
