export type SearchableDiscussion = {
  title?: unknown;
  text?: unknown;
  category?: unknown;
};

export function searchDiscussions<T extends SearchableDiscussion>(
  discussions: T[],
  query: string,
  category: 'all' | 'general' | string = 'all',
): T[] {
  const cleanQuery = query.trim().toLocaleLowerCase();
  const terms = cleanQuery.split(/\s+/).filter(Boolean);

  return discussions.filter((discussion) => {
    if (category !== 'all') {
      const discussionCategory = typeof discussion.category === 'string'
        ? discussion.category
        : 'general';
      if (discussionCategory !== category) return false;
    }
    if (terms.length === 0) return true;
    const searchable = [
      typeof discussion.title === 'string' ? discussion.title : '',
      typeof discussion.text === 'string' ? discussion.text : '',
      typeof discussion.category === 'string' ? discussion.category : 'general',
    ].join(' ').toLocaleLowerCase();
    return terms.every((term) => searchable.includes(term));
  });
}
