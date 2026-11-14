export function isProductStoragePath(path: unknown): path is string {
  if (typeof path !== 'string' || !path.startsWith('products/')) return false;
  const parts = path.split('/');
  return parts.length === 2
    && parts[0] === 'products'
    && /^[a-zA-Z0-9_-][a-zA-Z0-9._-]*$/.test(parts[1] ?? '')
    && parts[1] !== '.'
    && parts[1] !== '..';
}

export function getProductStoragePath(product: unknown): string | undefined {
  if (!product || typeof product !== 'object') return undefined;
  const record = product as Record<string, unknown>;
  if (isProductStoragePath(record.storagePath)) return record.storagePath;
  if (typeof record.imageUrl !== 'string' || !record.imageUrl.startsWith('/api/storage?')) {
    return undefined;
  }

  const path = new URL(record.imageUrl, 'https://slutwalkdenver.invalid')
    .searchParams.get('path');
  return isProductStoragePath(path) ? path : undefined;
}
