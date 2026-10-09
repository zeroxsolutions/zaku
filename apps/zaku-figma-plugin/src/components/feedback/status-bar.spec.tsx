import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { StatusBar } from './status-bar';

const CONNECTED = { state: 'connected', port: 7340 } as const;

describe('StatusBar', () => {
  it.each([
    [{ state: 'connected', port: 7340 }, 'Connected on port 7340'],
    [{ state: 'reconnecting', port: 7340 }, 'Reconnecting'],
    [{ state: 'disconnected', port: 7340 }, 'Not connected'],
    [{ state: 'idle' }, 'Not connected'],
    [{ state: 'unpaired' }, 'Not paired'],
  ] as const)('names the state %o', async (status, label) => {
    await render(<StatusBar status={status} file={null} running={null} now={0} />);
    await expect.element(page.getByText(label, { exact: true })).toBeVisible();
  });

  it('shows the file, and zaku before one says hello', async () => {
    const { rerender } = await render(<StatusBar status={CONNECTED} file={null} running={null} now={0} />);
    await expect.element(page.getByText('zaku', { exact: true })).toBeVisible();
    await rerender(<StatusBar status={CONNECTED} file="Acme" running={null} now={0} />);
    await expect.element(page.getByText('Acme')).toBeVisible();
  });

  it('shows the running command and how long it has run', async () => {
    await render(
      <StatusBar status={CONNECTED} file="Acme" running={{ command: 'check', id: 'r', since: 1000 }} now={4200} />,
    );
    await expect.element(page.getByText('Checking 3s')).toBeVisible();
  });

  it('carries the action the panel hands it', async () => {
    await render(
      <StatusBar status={CONNECTED} file="Acme" running={null} now={0}>
        <button type="button">Unpair</button>
      </StatusBar>,
    );
    await expect.element(page.getByRole('button', { name: 'Unpair' })).toBeVisible();
  });
});
