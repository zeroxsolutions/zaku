import { findByPath } from './find.js';

const title = { name: 'Title', children: [] };
const page = {
  name: 'Page 1',
  children: [
    { name: 'Card', id: 'first', children: [{ name: 'Header', children: [title] }] },
    { name: 'Card', id: 'second', children: [] },
  ],
};

describe('findByPath', () => {
  it('walks names from the page down, with or without the page name', () => {
    expect(findByPath(page as never, 'Card/Header/Title')).toBe(title);
    expect(findByPath(page as never, 'Page 1/Card/Header/Title')).toBe(title);
  });

  it('answers null when a segment is missing', () => {
    expect(findByPath(page as never, 'Card/Footer')).toBeNull();
  });

  it('takes the first of two siblings with one name', () => {
    expect((findByPath(page as never, 'Card') as unknown as { id: string }).id).toBe('first');
  });
});
