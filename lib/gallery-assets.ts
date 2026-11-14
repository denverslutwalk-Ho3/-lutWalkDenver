export function isPdfGalleryAsset(contentType: unknown, storagePath: unknown): boolean {
  return contentType === 'application/pdf'
    || (typeof storagePath === 'string' && storagePath.toLowerCase().endsWith('.pdf'));
}
