import { describe, expect, it, vi } from 'vitest';
import { collectMatchingItems } from './gallery-pagination';

describe('collectMatchingItems', () => {
  it('continues past non-matching pages until it has enough filtered results', async () => {
    const fetchPage = vi.fn()
      .mockResolvedValueOnce({ items: ['community-1', 'community-2'], nextCursor: 2, hasMore: true })
      .mockResolvedValueOnce({ items: ['archive-1', 'archive-2'], nextCursor: 4, hasMore: true })
      .mockResolvedValueOnce({ items: ['archive-3'], hasMore: false });

    await expect(
      collectMatchingItems<string, number>(fetchPage, (item) => item.startsWith('archive'), 3),
    ).resolves.toEqual(['archive-1', 'archive-2', 'archive-3']);
    expect(fetchPage).toHaveBeenNthCalledWith(1, undefined);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 2);
    expect(fetchPage).toHaveBeenNthCalledWith(3, 4);
  });

  it('rejects a page that claims more results but has no cursor', async () => {
    await expect(
      collectMatchingItems(async () => ({ items: ['x'], hasMore: true }), () => true, 2),
    ).rejects.toThrow('no cursor');
  });
});
