import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { StatusBar } from './status-bar';

describe('StatusBar', () => {
  it.each([
    ['connected', 'Connected'],
    ['reconnecting', 'Reconnecting'],
    ['disconnected', 'Disconnected'],
  ] as const)('names the %s state for a screen reader', async (status, label) => {
    await render(<StatusBar status={status} port={7337} file={null} running={null} now={0} />);
    await expect.element(page.getByText(label, { exact: true })).toBeInTheDocument();
  });

  it('shows the port and the file', async () => {
    await render(<StatusBar status="connected" port={7337} file="Acme" running={null} now={0} />);
    await expect.element(page.getByText(':7337')).toBeVisible();
    await expect.element(page.getByText('Acme')).toBeVisible();
  });

  it('shows the running command and how long it has run', async () => {
    await render(
      <StatusBar
        status="connected"
        port={7337}
        file="Acme"
        running={{ command: 'execute', id: 'r', since: 1000 }}
        now={4200}
      />,
    );
    await expect.element(page.getByText('execute 3s')).toBeVisible();
  });
});
