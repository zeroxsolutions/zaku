import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { CheckBar } from './check-bar';

describe('CheckBar', () => {
  it('checks the page on click, and not while a command runs', async () => {
    let checks = 0;
    const { rerender } = await render(<CheckBar count={null} canCheck onCheck={() => (checks += 1)} />);
    await page.getByRole('button', { name: 'Check page' }).click();
    expect(checks).toBe(1);
    await rerender(<CheckBar count={null} canCheck={false} onCheck={() => undefined} />);
    await expect.element(page.getByRole('button', { name: 'Check page' })).toBeDisabled();
  });

  it('counts the findings of the last check', async () => {
    await render(<CheckBar count={4} canCheck onCheck={() => undefined} />);
    await expect.element(page.getByText('4 findings')).toBeVisible();
  });
});
