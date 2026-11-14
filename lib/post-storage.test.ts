import { describe, expect, it } from 'vitest';
import { isPostStoragePath } from './post-storage';

describe('post storage paths', () => {
  it('accepts only generated paths scoped to the target post', () => {
    expect(isPostStoragePath('posts/post-1/1700000000000-image.png', 'post-1')).toBe(true);
    expect(isPostStoragePath('posts/post-2/1700000000000-image.png', 'post-1')).toBe(false);
    expect(isPostStoragePath('products/post-1/1700000000000-image.png', 'post-1')).toBe(false);
    expect(isPostStoragePath('posts/post-1/nested/1700000000000-image.png', 'post-1')).toBe(false);
    expect(isPostStoragePath('posts/post-1/../image.png', 'post-1')).toBe(false);
    expect(isPostStoragePath('posts/post-1/1700000000000-image.png'.repeat(20), 'post-1')).toBe(false);
  });
});
