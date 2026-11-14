export function isPostStoragePath(path: unknown, postId: string): path is string {
  if (typeof path !== 'string' || path.length > 512) return false;

  const [folder, ownerPostId, fileName, ...extraParts] = path.split('/');
  return folder === 'posts'
    && ownerPostId === postId
    && extraParts.length === 0
    && /^\d+-[A-Za-z0-9._-]*$/.test(fileName ?? '');
}
