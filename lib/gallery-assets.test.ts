import { describe, expect, it } from 'vitest';
import { isPdfGalleryAsset } from './gallery-assets';

describe('isPdfGalleryAsset', () => {
  it('recognizes PDFs from stored content type or legacy file paths', () => {
    expect(isPdfGalleryAsset('application/pdf', 'archive/zine')).toBe(true);
    expect(isPdfGalleryAsset('', 'archive/zine.PDF')).toBe(true);
    expect(isPdfGalleryAsset('image/png', 'archive/zine.png')).toBe(false);
  });
});
