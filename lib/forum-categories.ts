export const FORUM_CATEGORIES = [
  'announcements',
  'organizing',
  'mutual-aid',
  'education',
  'events',
  'community-care',
] as const;

export type ForumCategory = (typeof FORUM_CATEGORIES)[number];

export const FORUM_CATEGORY_LABELS: Record<ForumCategory, string> = {
  announcements: 'Announcements',
  organizing: 'Organizing',
  'mutual-aid': 'Mutual Aid',
  education: 'Education',
  events: 'Events',
  'community-care': 'Community Care',
};

export function normalizeForumCategory(value: unknown): ForumCategory | 'general' {
  if (typeof value === 'string' && FORUM_CATEGORIES.includes(value as ForumCategory)) {
    return value as ForumCategory;
  }
  return 'general';
}

export function isForumCategory(value: unknown): value is ForumCategory {
  return typeof value === 'string'
    && FORUM_CATEGORIES.includes(value as ForumCategory);
}
