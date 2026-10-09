import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { PairingForm } from './pairing-form';

/** Puts `text` on the clipboard the way a person copies it from the agent's reply. */
async function copy(text: string): Promise<void> {
  const source = document.createElement('textarea');
  source.value = text;
  source.setAttribute('aria-label', 'Copied from the agent');
  document.body.append(source);
  await userEvent.tripleClick(page.getByRole('textbox', { name: 'Copied from the agent' }));
  await userEvent.copy();
  source.remove();
}

describe('PairingForm', () => {
  it('asks for the code under its own heading, with the field still named', async () => {
    await render(<PairingForm refusal={null} onPair={() => undefined} />);
    await expect.element(page.getByRole('heading', { name: 'Pair with your agent' })).toBeVisible();
    await expect
      .element(page.getByText('Ask your agent to pair with zaku, then type the code here.', { exact: true }))
      .toBeVisible();
    await expect.element(page.getByRole('textbox', { name: 'Pairing code' })).toBeVisible();
    await expect.element(page.getByRole('alert')).not.toBeInTheDocument();
  });

  it('sends the eight digits once the last one is typed, and nothing before', async () => {
    const codes: string[] = [];
    await render(<PairingForm refusal={null} onPair={(code) => codes.push(code)} />);
    await page.getByRole('textbox', { name: 'Pairing code' }).click();
    await userEvent.keyboard('1234567');
    expect(codes).toEqual([]);
    await userEvent.keyboard('8');
    await expect.poll(() => codes).toEqual(['12345678']);
    await expect.element(page.getByRole('textbox', { name: 'Pairing code' })).toHaveValue('12345678');
  });

  it('takes digits only', async () => {
    await render(<PairingForm refusal={null} onPair={() => undefined} />);
    await page.getByRole('textbox', { name: 'Pairing code' }).click();
    await userEvent.keyboard('12 a-34');
    await expect.element(page.getByRole('textbox', { name: 'Pairing code' })).toHaveValue('1234');
  });

  it.each(['1234 5678', '1234-5678'])('sends %j pasted as the digits 12345678', async (pasted) => {
    const codes: string[] = [];
    await render(<PairingForm refusal={null} onPair={(code) => codes.push(code)} />);
    await copy(pasted);
    await page.getByRole('textbox', { name: 'Pairing code' }).click();
    await userEvent.paste();
    await expect.poll(() => codes).toEqual(['12345678']);
  });

  it.each([
    ['wrong-code', 'That code is not right. Check it and try again.'],
    ['expired-code', 'That code has expired. Ask your agent for a new one.'],
    ['used-up-code', 'This code was used up by wrong attempts. Ask your agent for a new one.'],
    ['unknown-token', 'zaku-mcp no longer knows this plugin. Ask your agent to pair with zaku again.'],
  ] as const)('says why the server refused: %s', async (refusal, text) => {
    await render(<PairingForm refusal={refusal} onPair={() => undefined} />);
    await expect.element(page.getByRole('alert')).toHaveTextContent(text);
    await expect.element(page.getByRole('textbox', { name: 'Pairing code' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('clears the code the server refused, so the next one starts empty', async () => {
    const { rerender } = await render(<PairingForm refusal={null} onPair={() => undefined} />);
    await page.getByRole('textbox', { name: 'Pairing code' }).click();
    await userEvent.keyboard('00000000');
    await rerender(<PairingForm refusal="wrong-code" onPair={() => undefined} />);
    await expect.element(page.getByRole('textbox', { name: 'Pairing code' })).toHaveValue('');
  });

  it('offers another port, when the panel hands it the switch', async () => {
    let asked = 0;
    await render(<PairingForm refusal="wrong-code" onPair={() => undefined} onUseAnotherPort={() => asked++} />);
    await page.getByRole('button', { name: 'Use another port' }).click();
    expect(asked).toBe(1);
  });
});
