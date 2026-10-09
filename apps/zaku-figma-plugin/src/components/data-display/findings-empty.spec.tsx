import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { FindingsEmpty } from './findings-empty';

describe('FindingsEmpty', () => {
  it.each([
    ['disconnected', 'Waiting for zaku-mcp'],
    ['unchecked', 'Check this page'],
    ['clean', 'This page is clean'],
  ] as const)('says what the %s panel waits for', async (reason, title) => {
    await render(<FindingsEmpty reason={reason} ports="7337-7346" />);
    await expect.element(page.getByText(title)).toBeVisible();
  });

  it('names the ports the panel looks on while it waits', async () => {
    await render(<FindingsEmpty reason="disconnected" ports="7337-7346" />);
    await expect.element(page.getByText(/ports 7337-7346/)).toBeVisible();
  });
});
