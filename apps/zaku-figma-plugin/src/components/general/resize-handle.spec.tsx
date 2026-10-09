import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { ResizeHandle } from './resize-handle';

describe('ResizeHandle', () => {
  it('reports the size the pointer drags the panel to', async () => {
    const sizes: [number, number][] = [];
    const { container } = await render(
      <>
        <ResizeHandle onResize={(width, height) => sizes.push([width, height])} />
        <div data-testid="target" style={{ position: 'fixed', left: 300, top: 400, width: 2, height: 2 }} />
      </>,
    );
    const handle = page.elementLocator(container.querySelector('[data-slot="resize-handle"]') as HTMLElement);
    await userEvent.dragAndDrop(handle, page.getByTestId('target'));
    expect(sizes.at(-1)).toEqual([307, 407]);
  });
});
