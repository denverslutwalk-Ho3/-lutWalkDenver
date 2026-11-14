export const MAX_UPLOAD_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_UPLOAD_REQUEST_SIZE = MAX_UPLOAD_FILE_SIZE + 1024 * 1024;
export const ALLOWED_UPLOAD_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
]);
