import { createFigmaRest, FigmaRateLimited } from './figma-rest.js';

function response(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

describe('createFigmaRest', () => {
  it('sends the token, counts each call and batches node ids', async () => {
    const urls: string[] = [];
    let calls = 0;
    const rest = createFigmaRest({
      token: 't',
      onCall: () => (calls += 1),
      fetch: async (url, init) => {
        urls.push(String(url));
        expect((init?.headers as Record<string, string>)['X-Figma-Token']).toBe('t');
        return response(200, { version: '9', nodes: {} });
      },
    });
    const ids = Array.from({ length: 60 }, (_, i) => `1:${i}`);
    await rest.nodes('KEY', ids);
    expect(calls).toBe(2);
    expect(urls[0]).toBe(
      `https://api.figma.com/v1/files/KEY/nodes?ids=${encodeURIComponent(ids.slice(0, 50).join(','))}`,
    );
  });

  it('waits for Retry-After once and retries, then throws on a second 429 without a third call', async () => {
    const waits: number[] = [];
    let calls = 0;
    const rest = createFigmaRest({
      token: 't',
      sleep: async (ms) => {
        waits.push(ms);
      },
      fetch: async () => {
        calls += 1;
        return response(429, {}, { 'Retry-After': '7' });
      },
    });
    await expect(rest.file('KEY', 1)).rejects.toThrow(FigmaRateLimited);
    expect(waits).toEqual([7000]);
    expect(calls).toBe(2);
  });

  it('caps a long Retry-After at 120 seconds', async () => {
    const waits: number[] = [];
    let first = true;
    const rest = createFigmaRest({
      token: 't',
      sleep: async (ms) => {
        waits.push(ms);
      },
      fetch: async () => {
        if (first) {
          first = false;
          return response(429, {}, { 'Retry-After': '3600' });
        }
        return response(200, {
          version: '1',
          document: { id: '0:0', name: 'Document', type: 'DOCUMENT', children: [] },
          components: {},
          componentSets: {},
          styles: {},
        });
      },
    });
    await rest.file('KEY', 1);
    expect(waits).toEqual([120_000]);
  });
});
