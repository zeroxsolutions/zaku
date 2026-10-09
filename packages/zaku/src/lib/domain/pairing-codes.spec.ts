import { CODE_ATTEMPTS, CODE_LIFETIME_MS, PairingCodes, displayCode } from './pairing-codes.js';

function codesAt(start = 1_000): { codes: PairingCodes; advance(ms: number): void } {
  let now = start;
  const draws = ['11112222', '33334444', '55556666'];
  const codes = new PairingCodes(
    () => now,
    () => draws.shift() ?? '99990000',
  );
  return { codes, advance: (ms) => (now += ms) };
}

describe('the pairing code', () => {
  it('is eight digits that expire five minutes after they are issued', () => {
    const { codes } = codesAt(1_000);
    expect(codes.issue()).toEqual({ code: '11112222', expiresAt: 1_000 + CODE_LIFETIME_MS });
  });

  it('draws eight random digits by default', () => {
    const { code } = new PairingCodes(() => 0).issue();
    expect(code).toMatch(/^\d{8}$/);
  });

  it('pairs once, and refuses the same code a second time as expired', () => {
    const { codes } = codesAt();
    const { code } = codes.issue();
    expect(codes.redeem(code)).toEqual({ kind: 'paired' });
    expect(codes.redeem(code)).toEqual({ kind: 'refused', reason: 'expired-code' });
  });

  it('refuses a code past its lifetime as expired', () => {
    const { codes, advance } = codesAt();
    const { code } = codes.issue();
    advance(CODE_LIFETIME_MS);
    expect(codes.redeem(code)).toEqual({ kind: 'refused', reason: 'expired-code' });
  });

  it('refuses any code as expired while none is live', () => {
    const { codes } = codesAt();
    expect(codes.redeem('11112222')).toEqual({ kind: 'refused', reason: 'expired-code' });
  });

  it('keeps one live code: a new issue replaces the old one', () => {
    const { codes } = codesAt();
    const first = codes.issue();
    const second = codes.issue();
    expect(codes.redeem(first.code)).toEqual({ kind: 'refused', reason: 'wrong-code' });
    expect(codes.redeem(second.code)).toEqual({ kind: 'paired' });
  });

  it('voids the code on the fifth wrong attempt, and refuses even the right one after', () => {
    const { codes } = codesAt();
    const { code } = codes.issue();
    for (let i = 1; i < CODE_ATTEMPTS; i++) expect(codes.redeem('00000000')).toMatchObject({ reason: 'wrong-code' });
    expect(codes.status()).toMatchObject({ state: 'live', attemptsLeft: 1 });
    expect(codes.redeem('00000000')).toEqual({ kind: 'refused', reason: 'used-up-code' });
    expect(codes.redeem(code)).toEqual({ kind: 'refused', reason: 'used-up-code' });
    expect(codes.status()).toEqual({ state: 'used-up' });
  });

  it('starts the attempt count again with a new code', () => {
    const { codes } = codesAt();
    codes.issue();
    for (let i = 0; i < CODE_ATTEMPTS; i++) codes.redeem('00000000');
    const { code } = codes.issue();
    expect(codes.redeem('00000000')).toMatchObject({ reason: 'wrong-code' });
    expect(codes.redeem(code)).toEqual({ kind: 'paired' });
  });

  it('reports no live code once it was used or expired', () => {
    const { codes, advance } = codesAt();
    expect(codes.status()).toEqual({ state: 'none' });
    codes.redeem(codes.issue().code);
    expect(codes.status()).toEqual({ state: 'none' });
    codes.issue();
    advance(CODE_LIFETIME_MS);
    expect(codes.status()).toEqual({ state: 'none' });
  });
});

describe('displayCode', () => {
  it('splits the digits into two groups of four', () => {
    expect(displayCode('12345678')).toBe('1234 5678');
  });
});
