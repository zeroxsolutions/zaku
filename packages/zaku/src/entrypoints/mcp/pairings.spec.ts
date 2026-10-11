import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PairingCodes } from '../../lib/domain/pairing-codes.js';
import { FilePairingStore } from '../../lib/repositories/pairing-store.js';
import { Pairings } from './pairings.js';

const pairings = (): Pairings =>
  new Pairings(
    new PairingCodes(
      () => 0,
      () => '12345678',
    ),
    new FilePairingStore(join(mkdtempSync(join(tmpdir(), 'zaku-pairings-')), 'pairings.json')),
  );

describe('Pairings', () => {
  it('admits a code with the client that issued it, and a token with no issuer', async () => {
    const p = pairings();
    const issuer = { id: 'b', cwd: '/work/b' };
    p.issueCode(issuer);
    const paired = await p.admit({ code: '12345678' }, 'Untitled');
    expect(paired).toMatchObject({ kind: 'admitted', issuer });
    if (paired.kind !== 'admitted' || paired.issued === null) throw new Error('not paired');
    expect(await p.admit({ token: paired.issued }, 'Untitled')).toMatchObject({ kind: 'admitted', issuer: null });
  });

  it('admits a code issued with no client with no issuer', async () => {
    const p = pairings();
    p.issueCode();
    expect(await p.admit({ code: '12345678' }, 'Untitled')).toMatchObject({ kind: 'admitted', issuer: null });
  });
});
