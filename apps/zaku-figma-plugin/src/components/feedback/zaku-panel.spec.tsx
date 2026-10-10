import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { INITIAL_PANEL_STATE, type PanelState } from '@/lib/panel-state';
import { ZakuPanel } from './zaku-panel';

/** The panel over `state`, with every action recorded by name and argument. */
async function panelOver(state: Partial<PanelState>): Promise<unknown[][]> {
  const calls: unknown[][] = [];
  const record =
    (name: string) =>
    (...args: unknown[]): void => {
      calls.push([name, ...args]);
    };
  await render(
    <ZakuPanel
      state={{ ...INITIAL_PANEL_STATE, ...state }}
      now={0}
      checkAgain={record('checkAgain')}
      pair={record('pair')}
      connect={record('connect')}
      unpair={record('unpair')}
      select={record('select')}
      resize={record('resize')}
      dismissError={record('dismissError')}
      retryError={record('retryError')}
    />,
  );
  return calls;
}

describe('ZakuPanel', () => {
  it.each([
    ['paired', { phase: 'paired' }],
    ['unpaired, with a code in flight', { phase: 'unpaired', refusal: null }],
  ] as const)('shows the Port field while nothing answers, %s', async (_, pairing) => {
    await panelOver({ pairing, connection: { state: 'disconnected', port: 7337 } });
    await expect.element(page.getByText('Not connected', { exact: true })).toBeVisible();
    await expect.element(page.getByRole('textbox', { name: 'Port' })).toBeVisible();
    await expect.element(page.getByRole('textbox', { name: 'Pairing code' })).not.toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Unpair' })).not.toBeInTheDocument();
  });

  it('connects on the port the user enters', async () => {
    const calls = await panelOver({ pairing: { phase: 'paired' }, connection: { state: 'disconnected', port: 7337 } });
    await page.getByRole('textbox', { name: 'Port' }).fill('7340');
    await page.getByRole('button', { name: 'Connect' }).click();
    expect(calls).toEqual([['connect', 7340]]);
  });

  it('asks for the pairing code, and no port, before the plugin has dialed', async () => {
    await panelOver({ pairing: { phase: 'unpaired', refusal: null } });
    await expect.element(page.getByText('Not paired', { exact: true })).toBeVisible();
    await expect.element(page.getByRole('textbox', { name: 'Pairing code' })).toBeVisible();
    await expect.element(page.getByRole('textbox', { name: 'Port' })).not.toBeInTheDocument();
  });

  it('names the port it is connected on, and offers to unpair and check', async () => {
    await panelOver({ pairing: { phase: 'paired' }, connection: { state: 'connected', port: 7340 }, file: 'Acme' });
    await expect.element(page.getByText('Connected on port 7340')).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Unpair' })).toBeVisible();
    await expect.element(page.getByRole('textbox', { name: 'Port' })).not.toBeInTheDocument();
  });

  it.each([
    ['not paired', null],
    ['refused', 'wrong-code'],
  ] as const)('switches from the code to the Port field and back, %s', async (_, refusal) => {
    await panelOver({ pairing: { phase: 'unpaired', refusal } });
    await page.getByRole('button', { name: 'Use another port' }).click();
    await expect.element(page.getByRole('textbox', { name: 'Port' })).toBeVisible();
    await expect.element(page.getByRole('textbox', { name: 'Pairing code' })).not.toBeInTheDocument();
    await page.getByRole('button', { name: 'Back to the code' }).click();
    await expect.element(page.getByRole('textbox', { name: 'Pairing code' })).toBeVisible();
    await expect.element(page.getByRole('textbox', { name: 'Port' })).not.toBeInTheDocument();
  });

  it('keeps the port the user picks for the code, and goes back to the code', async () => {
    const calls = await panelOver({ pairing: { phase: 'unpaired', refusal: 'wrong-code' } });
    await page.getByRole('button', { name: 'Use another port' }).click();
    await page.getByRole('textbox', { name: 'Port' }).fill('7341');
    await page.getByRole('button', { name: 'Connect' }).click();
    expect(calls).toEqual([['connect', 7341]]);
    await expect.element(page.getByRole('textbox', { name: 'Pairing code' })).toBeVisible();
  });

  it('keeps every line of the header on one line at the panel width while a check runs', async () => {
    await page.viewport(320, 480);
    await panelOver({
      pairing: { phase: 'paired' },
      connection: { state: 'connected', port: 7340 },
      file: 'Acme',
      running: { command: 'check', id: 'r', since: 0 },
      findings: [],
    });
    for (const slot of ['status-bar-file', 'status-bar-status']) {
      const line = document.querySelector<HTMLElement>(`[data-slot="${slot}"]`);
      if (!line) throw new Error(`no ${slot}`);
      expect([slot, line.getClientRects().length, line.getBoundingClientRect().height]).toEqual([
        slot,
        1,
        Number.parseFloat(getComputedStyle(line).lineHeight),
      ]);
    }
    await expect.element(page.getByText('Connected on port 7340')).toBeVisible();
    await expect.element(page.getByText('Checking 0s')).toBeVisible();
  });

  it('hides Unpair while paired and reconnecting', async () => {
    await panelOver({ pairing: { phase: 'paired' }, connection: { state: 'reconnecting', port: 7340 } });
    await expect.element(page.getByText('Reconnecting', { exact: true })).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Unpair' })).not.toBeInTheDocument();
  });

  it('asks before it unpairs, and unpairs only on the destructive Unpair', async () => {
    const calls = await panelOver({ pairing: { phase: 'paired' }, connection: { state: 'connected', port: 7340 } });
    await page.getByRole('button', { name: 'Unpair' }).click();
    const dialog = page.getByRole('alertdialog', { name: 'Unpair zaku?' });
    await expect.element(dialog).toBeVisible();
    await expect
      .element(
        dialog.getByText('zaku-mcp forgets this plugin. To connect again, ask your agent for a new pairing code.'),
      )
      .toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect.element(dialog).not.toBeInTheDocument();
    expect(calls).toEqual([]);
    await page.getByRole('button', { name: 'Unpair' }).click();
    await page.getByRole('alertdialog', { name: 'Unpair zaku?' }).getByRole('button', { name: 'Unpair' }).click();
    expect(calls).toEqual([['unpair']]);
  });

  it('shows a sandbox error the user can dismiss', async () => {
    const calls = await panelOver({ error: { message: 'TypeError: node is gone', retry: null } });
    const alert = page.getByRole('alert');
    await expect.element(alert.getByText('The plugin hit an error in Figma')).toBeVisible();
    await expect.element(alert.getByText('TypeError: node is gone')).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    await page.getByRole('button', { name: 'Dismiss' }).click();
    expect(calls).toEqual([['dismissError']]);
  });

  it('offers to retry a panel command that threw', async () => {
    const calls = await panelOver({
      error: { message: 'TypeError: node is gone', retry: { type: 'select', nodeId: '1:1' } },
    });
    await page.getByRole('button', { name: 'Retry' }).click();
    expect(calls).toEqual([['retryError']]);
  });
});
