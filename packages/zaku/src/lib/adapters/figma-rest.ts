import type { RestFileResponse, RestNodesResponse, RestPublished } from './figma-rest-types.js';

export class FigmaRateLimited extends Error {
  constructor(readonly url: string) {
    super(`Figma answered 429 twice for ${url}; wait and run again`);
    this.name = 'FigmaRateLimited';
  }
}

export class FigmaRequestFailed extends Error {
  constructor(
    readonly url: string,
    readonly status: number,
    body: string,
  ) {
    super(`Figma answered ${status} for ${url}: ${body.slice(0, 200)}`);
    this.name = 'FigmaRequestFailed';
  }
}

export interface FigmaRest {
  file(fileKey: string, depth: number): Promise<RestFileResponse>;
  nodes(fileKey: string, ids: readonly string[]): Promise<RestNodesResponse>;
  images(fileKey: string, ids: readonly string[]): Promise<Record<string, string | null>>;
  /** The component sets and the components a library file publishes. */
  published(fileKey: string): Promise<{ sets: RestPublished[]; components: RestPublished[] }>;
}

const BASE = 'https://api.figma.com/v1';
const BATCH = 50;
const MAX_WAIT_MS = 120_000;

export function createFigmaRest(options: {
  token: string;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  onCall?: () => void;
}): FigmaRest {
  const send = options.fetch ?? globalThis.fetch;
  const sleep = options.sleep ?? ((ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms)));
  const onCall = options.onCall ?? ((): void => undefined);

  async function call<T>(url: string): Promise<T> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const res = await send(url, { headers: { 'X-Figma-Token': options.token } });
      onCall();
      if (res.status === 429) {
        if (attempt === 1) break;
        const seconds = Number(res.headers.get('Retry-After') ?? '60');
        await sleep(Math.min(Number.isFinite(seconds) ? seconds * 1000 : 60_000, MAX_WAIT_MS));
        continue;
      }
      if (!res.ok) throw new FigmaRequestFailed(url, res.status, await res.text());
      return (await res.json()) as T;
    }
    throw new FigmaRateLimited(url);
  }

  const chunks = (ids: readonly string[]): string[][] =>
    Array.from({ length: Math.ceil(ids.length / BATCH) }, (_, index) => ids.slice(index * BATCH, (index + 1) * BATCH));

  return {
    file: (fileKey, depth) => call<RestFileResponse>(`${BASE}/files/${fileKey}?depth=${depth}`),
    async nodes(fileKey, ids): Promise<RestNodesResponse> {
      const merged: RestNodesResponse = { version: '', nodes: {} };
      for (const chunk of chunks(ids)) {
        const part = await call<RestNodesResponse>(
          `${BASE}/files/${fileKey}/nodes?ids=${encodeURIComponent(chunk.join(','))}`,
        );
        merged.version = part.version;
        Object.assign(merged.nodes, part.nodes);
      }
      return merged;
    },
    async published(fileKey): Promise<{ sets: RestPublished[]; components: RestPublished[] }> {
      type Meta<K extends string> = { meta: Record<K, RestPublished[]> };
      const sets = await call<Meta<'component_sets'>>(`${BASE}/files/${fileKey}/component_sets`);
      const components = await call<Meta<'components'>>(`${BASE}/files/${fileKey}/components`);
      return { sets: sets.meta.component_sets, components: components.meta.components };
    },
    async images(fileKey, ids): Promise<Record<string, string | null>> {
      const merged: Record<string, string | null> = {};
      for (const chunk of chunks(ids)) {
        const part = await call<{ images: Record<string, string | null> }>(
          `${BASE}/images/${fileKey}?ids=${encodeURIComponent(chunk.join(','))}&format=png&scale=1`,
        );
        Object.assign(merged, part.images);
      }
      return merged;
    },
  };
}
