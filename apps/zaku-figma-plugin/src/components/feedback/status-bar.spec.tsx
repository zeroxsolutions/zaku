import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { StatusBar } from './status-bar';

describe('StatusBar', () => {
  it.each([
    ['connected', 'Connected'],
    ['reconnecting', 'Reconnecting'],
    ['disconnected', 'Not connected'],
    ['unpaired', 'Not paired'],
  ] as const)('names the %s state', async (status, label) => {
    await render(<StatusBar status={status} file={null} running={null} now={0} />);
    await expect.element(page.getByText(label, { exact: true })).toBeVisible();
  });

  it('shows the file, and zaku before one says hello', async () => {
    const { rerender } = await render(<StatusBar status="connected" file={null} running={null} now={0} />);
    await expect.element(page.getByText('zaku', { exact: true })).toBeVisible();
    await rerender(<StatusBar status="connected" file="Acme" running={null} now={0} />);
    await expect.element(page.getByText('Acme')).toBeVisible();
  });

  it('shows the running command and how long it has run', async () => {
    await render(
      <StatusBar status="connected" file="Acme" running={{ command: 'check', id: 'r', since: 1000 }} now={4200} />,
    );
    await expect.element(page.getByText('Checking 3s')).toBeVisible();
  });

  it('carries the action the panel hands it', async () => {
    await render(
      <StatusBar status="connected" file="Acme" running={null} now={0}>
        <button type="button">Unpair</button>
      </StatusBar>,
    );
    await expect.element(page.getByRole('button', { name: 'Unpair' })).toBeVisible();
  });
});
