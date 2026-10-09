import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { PairingForm } from './pairing-form';

describe('PairingForm', () => {
  it('says the panel is not paired, and asks for the code', async () => {
    await render(<PairingForm refusal={null} onPair={() => undefined} />);
    await expect
      .element(page.getByText('Not paired. Ask your agent to pair with zaku, then type the code here.'))
      .toBeVisible();
    await expect.element(page.getByLabelText('Pairing code')).toBeVisible();
    await expect.element(page.getByRole('alert')).not.toBeInTheDocument();
  });

  it.each([
    ['1234 5678', '12345678'],
    ['1234-5678', '12345678'],
    [' 12345678 ', '12345678'],
  ])('sends %j as the digits %s', async (typed, sent) => {
    const codes: string[] = [];
    await render(<PairingForm refusal={null} onPair={(code) => codes.push(code)} />);
    await page.getByLabelText('Pairing code').fill(typed);
    await page.getByRole('button', { name: 'Pair' }).click();
    expect(codes).toEqual([sent]);
  });

  it('sends nothing for an empty field', async () => {
    const codes: string[] = [];
    await render(<PairingForm refusal={null} onPair={(code) => codes.push(code)} />);
    await page.getByRole('button', { name: 'Pair' }).click();
    expect(codes).toEqual([]);
  });

  it.each([
    ['wrong-code', 'That code is not right. Check it and try again.'],
    ['expired-code', 'That code has expired. Ask your agent for a new one.'],
    ['used-up-code', 'This code was used up by wrong attempts. Ask your agent for a new one.'],
    ['unknown-token', 'zaku-mcp no longer knows this plugin. Ask your agent to pair with zaku again.'],
  ] as const)('says why the server refused: %s', async (refusal, text) => {
    await render(<PairingForm refusal={refusal} onPair={() => undefined} />);
    await expect.element(page.getByRole('alert')).toHaveTextContent(text);
    await expect.element(page.getByLabelText('Pairing code')).toHaveAttribute('aria-invalid', 'true');
  });
});
