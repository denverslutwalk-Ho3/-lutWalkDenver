import { describe, expect, it } from 'vitest';
import {
  FORUM_CATEGORIES,
  normalizeForumCategory,
  isForumCategory,
} from './forum-categories';

describe('forum categories', () => {
  it('defines six initial categories', () => {
    expect(FORUM_CATEGORIES).toHaveLength(6);
  });

  it('accepts valid categories and normalizes legacy posts', () => {
    expect(isForumCategory('mutual-aid')).toBe(true);
    expect(isForumCategory('unknown')).toBe(false);
    expect(normalizeForumCategory(undefined)).toBe('general');
  });
});
