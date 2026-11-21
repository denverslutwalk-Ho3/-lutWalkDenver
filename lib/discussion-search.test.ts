import { describe, expect, it } from 'vitest';
import { searchDiscussions } from './discussion-search';

describe('discussion search', () => {
  const discussions = [
    { id: '1', title: 'Mutual aid ride', text: 'Need a ride Saturday', category: 'mutual-aid' },
    { id: '2', title: 'Workshop', text: 'Consent and care', category: 'education' },
  ];

  it('matches title and body terms without an external search service', () => {
    expect(searchDiscussions(discussions, 'ride saturday').map((item) => item.id)).toEqual(['1']);
  });

  it('combines text search with category filters', () => {
    expect(searchDiscussions(discussions, 'care', 'education').map((item) => item.id)).toEqual(['2']);
    expect(searchDiscussions(discussions, 'care', 'mutual-aid')).toEqual([]);
  });

  it('returns all discussions for an empty query', () => {
    expect(searchDiscussions(discussions, '')).toHaveLength(2);
  });
});
