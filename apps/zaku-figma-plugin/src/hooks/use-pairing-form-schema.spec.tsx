import { renderHook } from 'vitest-browser-react';
import { usePairingFormSchema } from './use-pairing-form-schema';

describe('usePairingFormSchema', () => {
  it('takes eight digits', async () => {
    const { result } = await renderHook(() => usePairingFormSchema());
    expect(result.current.safeParse({ code: '12345678' }).success).toBe(true);
  });

  it.each([
    ['', 'Type the code your agent shows.'],
    ['1234 567', 'The code is digits only.'],
    ['1234567', 'The code has 8 digits.'],
    ['123456789', 'The code has 8 digits.'],
  ])('refuses %j with the first rule it breaks', async (code, message) => {
    const { result } = await renderHook(() => usePairingFormSchema());
    const parsed = result.current.safeParse({ code });
    expect(parsed.error?.issues.map((issue) => issue.message)).toEqual([message]);
  });
});
