import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { FindingsEmpty } from './findings-empty';

describe('FindingsEmpty', () => {
  it('says there are no findings and checks again on click', async () => {
    let checks = 0;
    await render(<FindingsEmpty canCheck onCheckAgain={() => (checks += 1)} />);
    await expect.element(page.getByText('No findings')).toBeVisible();
    await page.getByRole('button', { name: 'Check again' }).click();
    expect(checks).toBe(1);
  });

  it('offers no check while no file is connected', async () => {
    await render(<FindingsEmpty canCheck={false} onCheckAgain={() => undefined} />);
    await expect.element(page.getByRole('button', { name: 'Check again' })).toBeDisabled();
  });
});
