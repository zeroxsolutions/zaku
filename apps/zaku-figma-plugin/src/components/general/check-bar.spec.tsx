import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { CheckBar } from './check-bar';

describe('CheckBar', () => {
  it('checks the page on click, and not while a command runs', async () => {
    let checks = 0;
    const { rerender } = await render(
      <CheckBar count={null} canCheck running={null} now={0} onCheck={() => (checks += 1)} />,
    );
    await page.getByRole('button', { name: 'Check page' }).click();
    expect(checks).toBe(1);
    await rerender(<CheckBar count={null} canCheck={false} running={null} now={0} onCheck={() => undefined} />);
    await expect.element(page.getByRole('button', { name: 'Check page' })).toBeDisabled();
  });

  it('counts the findings of the last check', async () => {
    await render(<CheckBar count={4} canCheck running={null} now={0} onCheck={() => undefined} />);
    await expect.element(page.getByText('4 findings')).toBeVisible();
  });

  it('shows the running command and how long it has run, beside the check it holds back', async () => {
    await render(
      <CheckBar
        count={2}
        canCheck={false}
        running={{ command: 'check', id: 'r', since: 1000 }}
        now={4200}
        onCheck={() => undefined}
      />,
    );
    await expect.element(page.getByText('Checking 3s')).toBeVisible();
    await expect.element(page.getByText('2 findings')).toBeVisible();
  });
});
