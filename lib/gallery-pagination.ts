type Page<T, Cursor> = {
  items: T[];
  nextCursor?: Cursor;
  hasMore: boolean;
};

export async function collectMatchingItems<T, Cursor>(
  fetchPage: (cursor?: Cursor) => Promise<Page<T, Cursor>>,
  matches: (item: T) => boolean,
  limit: number,
): Promise<T[]> {
  const results: T[] = [];
  let cursor: Cursor | undefined;

  while (results.length < limit) {
    const page = await fetchPage(cursor);
    for (const item of page.items) {
      if (matches(item)) results.push(item);
      if (results.length === limit) break;
    }

    if (!page.hasMore) break;
    if (page.nextCursor === undefined) {
      throw new Error('Gallery pagination returned no cursor for a non-final page');
    }
    cursor = page.nextCursor;
  }

  return results;
}
