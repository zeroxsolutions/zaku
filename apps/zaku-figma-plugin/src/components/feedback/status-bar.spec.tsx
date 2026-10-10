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
    await render(<StatusBar status={status} file={null} />);
    await expect.element(page.getByText(label, { exact: true })).toBeVisible();
  });

  it('shows the file, and zaku before one says hello', async () => {
    const { rerender } = await render(<StatusBar status={CONNECTED} file={null} />);
    await expect.element(page.getByText('zaku', { exact: true })).toBeVisible();
    await rerender(<StatusBar status={CONNECTED} file="Acme" />);
    await expect.element(page.getByText('Acme')).toBeVisible();
  });

  it('names the file and the state in full on hover, where the panel cuts them short', async () => {
    await render(<StatusBar status={CONNECTED} file="Acme" />);
    await expect.element(page.getByTitle('Acme')).toBeVisible();
    await expect.element(page.getByTitle('Connected on port 7340')).toBeVisible();
  });

  it('carries the action the panel hands it', async () => {
    await render(
      <StatusBar status={CONNECTED} file="Acme">
        <button type="button">Unpair</button>
      </StatusBar>,
    );
    await expect.element(page.getByRole('button', { name: 'Unpair' })).toBeVisible();
  });
});
