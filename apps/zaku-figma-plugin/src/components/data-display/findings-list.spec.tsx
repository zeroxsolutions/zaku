import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { FindingsList } from './findings-list';

describe('FindingsList', () => {
  it('groups the findings under the rule they break and selects the node of a finding on click', async () => {
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
    await page
      .getByRole('listitem')
      .filter({ hasText: 'Card (frame): fill is a raw value' })
      .getByRole('button', { name: 'Select layer' })
      .click();
    expect(selected).toEqual(['1:1']);
  });

  it('names the frame and the field under a finding, never the node id', async () => {
    await render(
      <FindingsList
        findings={[
          {
            check: 'binding',
            nodeId: '1:1',
            frame: 'Trips / Desktop',
            field: 'fill',
            message: 'Card (frame): fill is a raw value',
          },
        ]}
        onSelectNode={() => undefined}
      />,
    );
    await expect.element(page.getByText('Trips / Desktop', { exact: true })).toBeVisible();
    await expect.element(page.getByText('fill', { exact: true })).toBeVisible();
    await expect.element(page.getByText(/1:1/)).not.toBeInTheDocument();
  });

  it('offers no selection for a finding with no node', async () => {
    await render(
      <FindingsList
        findings={[{ check: 'binding', message: 'A finding with no node' }]}
        onSelectNode={() => undefined}
      />,
    );
    await expect.element(page.getByText('A finding with no node')).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Select layer' })).not.toBeInTheDocument();
  });
});
