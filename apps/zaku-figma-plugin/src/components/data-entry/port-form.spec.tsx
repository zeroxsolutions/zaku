import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { PortForm } from './port-form';

const PORTS = [7337, 7338, 7339, 7340, 7341, 7342, 7343, 7344, 7345, 7346] as const;

describe('PortForm', () => {
  it('names the port nothing answers on, and offers it to change', async () => {
    await render(<PortForm port={7337} ports={PORTS} onConnect={() => undefined} />);
    await expect
      .element(page.getByText('No zaku-mcp answers on port 7337. Ask your agent for its port.'))
      .toBeVisible();
    await expect.element(page.getByRole('textbox', { name: 'Port' })).toHaveValue('7337');
    await expect.element(page.getByRole('alert')).not.toBeInTheDocument();
  });

  it('connects on a port inside the range', async () => {
    const ports: number[] = [];
    await render(<PortForm port={7337} ports={PORTS} onConnect={(port) => ports.push(port)} />);
    await page.getByRole('textbox', { name: 'Port' }).fill('7340');
    await page.getByRole('button', { name: 'Connect' }).click();
    expect(ports).toEqual([7340]);
  });

  it.each(['80', '9000', '', 'abc'])('refuses %j, naming the range', async (typed) => {
    const ports: number[] = [];
    await render(<PortForm port={7337} ports={PORTS} onConnect={(port) => ports.push(port)} />);
    await page.getByRole('textbox', { name: 'Port' }).fill(typed);
    await page.getByRole('button', { name: 'Connect' }).click();
    await expect.element(page.getByRole('alert')).toHaveTextContent('Enter a port from 7337 to 7346.');
    await expect.element(page.getByRole('textbox', { name: 'Port' })).toHaveAttribute('aria-invalid', 'true');
    expect(ports).toEqual([]);
  });

  it('drops the range message once a port inside it connects', async () => {
    await render(<PortForm port={7337} ports={PORTS} onConnect={() => undefined} />);
    await page.getByRole('textbox', { name: 'Port' }).fill('80');
    await page.getByRole('button', { name: 'Connect' }).click();
    await page.getByRole('textbox', { name: 'Port' }).fill('7341');
    await page.getByRole('button', { name: 'Connect' }).click();
    await expect.element(page.getByRole('alert')).not.toBeInTheDocument();
  });
});
