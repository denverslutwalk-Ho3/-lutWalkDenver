import { describe, expect, it } from 'vitest';
import { getProductStoragePath, isProductStoragePath } from './product-storage';

describe('isProductStoragePath', () => {
  it('accepts product objects and rejects other storage paths', () => {
    expect(isProductStoragePath('products/1700000000000-shirt.png')).toBe(true);
    expect(isProductStoragePath('archive/1700000000000-poster.pdf')).toBe(false);
    expect(isProductStoragePath('products/../private.png')).toBe(false);
    expect(isProductStoragePath('products/nested/image.png')).toBe(false);
  });

  it('resolves legacy product paths from their private storage URL', () => {
    expect(getProductStoragePath({
      imageUrl: '/api/storage?path=products%2Fold-image.png',
    })).toBe('products/old-image.png');
    expect(getProductStoragePath({ imageUrl: 'https://example.com/image.png' })).toBeUndefined();
    expect(getProductStoragePath({
      imageUrl: 'https://example.com/?path=products%2Fnot-owned.png',
    })).toBeUndefined();
  });
});
