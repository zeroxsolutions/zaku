import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { FindingsList } from './findings-list';

describe('FindingsList', () => {
  it('groups the findings by rule and selects a finding’s node on click', async () => {
    const selected: string[] = [];
    await render(
      <FindingsList
        findings={[
          { check: 'binding', nodeId: '1:1', message: 'Card (frame): fill is a raw value' },
          { check: 'naming', nodeId: '1:1', message: 'Card keeps a default name' },
          { check: 'binding', message: 'A finding with no node' },
        ]}
        onSelectNode={(id) => selected.push(id)}
        canCheck
        onCheckAgain={() => undefined}
      />,
    );
    await expect.element(page.getByRole('region', { name: 'binding (2)' })).toBeVisible();
    await expect.element(page.getByRole('region', { name: 'naming (1)' })).toBeVisible();
    await page.getByRole('button', { name: 'Card (frame): fill is a raw value' }).click();
    expect(selected).toEqual(['1:1']);
  });

  it('shows a finding with no node as text, not a button', async () => {
    await render(
      <FindingsList
        findings={[{ check: 'binding', message: 'A finding with no node' }]}
        onSelectNode={() => undefined}
        canCheck
        onCheckAgain={() => undefined}
      />,
    );
    await expect.element(page.getByText('A finding with no node')).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'A finding with no node' })).not.toBeInTheDocument();
  });

  it('checks again while findings are shown, and not while a command runs', async () => {
    let checks = 0;
    const findings = [{ check: 'naming' as const, nodeId: '1:1', message: 'Frame keeps a default name' }];
    const { rerender } = await render(
      <FindingsList findings={findings} onSelectNode={() => undefined} canCheck onCheckAgain={() => (checks += 1)} />,
    );
    await page.getByRole('button', { name: 'Check again' }).click();
    expect(checks).toBe(1);
    await rerender(
      <FindingsList
        findings={findings}
        onSelectNode={() => undefined}
        canCheck={false}
        onCheckAgain={() => undefined}
      />,
    );
    await expect.element(page.getByRole('button', { name: 'Check again' })).toBeDisabled();
  });
});
