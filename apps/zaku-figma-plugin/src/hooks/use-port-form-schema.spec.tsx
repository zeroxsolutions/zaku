import { renderHook } from 'vitest-browser-react';
import { usePortFormSchema } from './use-port-form-schema';

const RANGE_MESSAGE = 'Enter a port from 7337 to 7346.';

describe('usePortFormSchema', () => {
  it.each(['7337', '7340', '7346'])('takes %j', async (port) => {
    const { result } = await renderHook(() => usePortFormSchema());
    expect(result.current.safeParse({ port }).success).toBe(true);
  });

  it.each(['', 'abc', '7340.5', '80', '7336', '7347', '9000'])(
    'refuses %j with one message naming the range',
    async (port) => {
      const { result } = await renderHook(() => usePortFormSchema());
      const parsed = result.current.safeParse({ port });
      expect(parsed.error?.issues.map((issue) => issue.message)).toEqual([RANGE_MESSAGE]);
    },
  );

  it('builds the schema once', async () => {
    const { result, rerender } = await renderHook(() => usePortFormSchema());
    const first = result.current;
    await rerender();
    expect(result.current).toBe(first);
  });
});
