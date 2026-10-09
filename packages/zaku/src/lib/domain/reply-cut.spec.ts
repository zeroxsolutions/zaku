import { REPLY_LIMIT, cutReply } from './reply-cut.js';

describe('cutReply', () => {
  it('leaves a small reply as it is', () => {
    const reply = { created: ['1:1'], mutated: [], value: 1 };
    expect(cutReply(reply)).toBe(reply);
  });

  it('cuts a large reply to its root ids', () => {
    const created = Array.from({ length: 3000 }, (_, i) => `1:${i}`);
    const parents: Record<string, string | null> = { '1:0': '0:1' };
    for (const id of created.slice(1)) parents[id] = '1:0';
    const cut = cutReply({ created, mutated: [], value: 'x'.repeat(100), snapshotParents: parents });
    expect(JSON.stringify(cut).length).toBeLessThan(REPLY_LIMIT);
    expect(cut).toMatchObject({ created: { count: 3000, roots: ['1:0'] }, cut: true });
  });

  it('replaces a value too large on its own with its size', () => {
    const cut = cutReply({ created: [], mutated: [], value: 'x'.repeat(30_000) });
    expect(cut).toMatchObject({ value: { cut: true, bytes: 30_002 } });
  });

  it('stays under the limit as the tool prints it, with thousands of roots and findings', () => {
    const created = Array.from({ length: 3000 }, (_, i) => `1:${i}`);
    const parents = Object.fromEntries(created.map((id) => [id, '0:1']));
    const findings = created.flatMap((id) => [
      {
        check: 'binding' as const,
        nodeId: id,
        field: 'fill',
        message: `Rectangle ${id} (rectangle): fill is a raw value`,
      },
      { check: 'naming' as const, nodeId: id, message: `Rectangle ${id} keeps a default name` },
    ]);
    const cut = cutReply({
      created,
      mutated: [],
      value: null,
      findings,
      untouchable: created,
      snapshotParents: parents,
    });
    expect(JSON.stringify(cut, null, 2).length).toBeLessThan(REPLY_LIMIT);
    expect(cut).toMatchObject({
      created: { count: 3000, more: 2980 },
      findingCounts: { binding: 3000, naming: 3000 },
      untouchableCount: 3000,
      cut: true,
    });
  });
});
