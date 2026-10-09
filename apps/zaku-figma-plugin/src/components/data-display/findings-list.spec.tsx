import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { FindingsList } from './findings-list';

describe('FindingsList', () => {
  it('groups the findings under the rule they break and selects a finding’s node on click', async () => {
    const selected: string[] = [];
    await render(
      <FindingsList
        findings={[
          { check: 'binding', nodeId: '1:1', field: 'fill', message: 'Card (frame): fill is a raw value' },
          { check: 'naming', nodeId: '1:1', message: 'Card keeps a default name' },
          { check: 'binding', message: 'A finding with no node' },
        ]}
        onSelectNode={(id) => selected.push(id)}
      />,
    );
    await expect.element(page.getByRole('region', { name: 'Token binding, 2 findings' })).toBeVisible();
    await expect.element(page.getByRole('region', { name: 'Layer naming, 1 finding' })).toBeVisible();
    await page.getByRole('button', { name: /Card \(frame\): fill is a raw value/ }).click();
    expect(selected).toEqual(['1:1']);
  });

  it('names the field and the node under a finding', async () => {
    await render(
      <FindingsList
        findings={[{ check: 'binding', nodeId: '1:1', field: 'fill', message: 'Card (frame): fill is a raw value' }]}
        onSelectNode={() => undefined}
      />,
    );
    await expect.element(page.getByText('fill · 1:1')).toBeVisible();
  });

  it('shows a finding with no node as text, not a button', async () => {
    await render(
      <FindingsList
        findings={[{ check: 'binding', message: 'A finding with no node' }]}
        onSelectNode={() => undefined}
      />,
    );
    await expect.element(page.getByText('A finding with no node')).toBeVisible();
    await expect.element(page.getByRole('button', { name: /A finding with no node/ })).not.toBeInTheDocument();
  });
});
