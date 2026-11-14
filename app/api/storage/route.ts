import { NextResponse } from 'next/server';
import { getServerSession } from '../../../lib/authz';
import { getAdminStorage } from '../../../lib/firebase-admin';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
]);
const ALLOWED_FOLDERS = new Set(['archive', 'bulletin', 'community', 'posts', 'products']);

function isValidStoragePath(path: string) {
  const parts = path.split('/');
  return parts.length >= 2
    && ALLOWED_FOLDERS.has(parts[0] ?? '')
    && parts.every((part) =>
      part !== '.' && part !== '..' && /^[a-zA-Z0-9_-][a-zA-Z0-9._-]*$/.test(part),
    );
}

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const path = new URL(request.url).searchParams.get('path') ?? '';
  if (!isValidStoragePath(path)) {
    return NextResponse.json({ error: 'Invalid storage path' }, { status: 400 });
  }

  try {
    const file = getAdminStorage().bucket().file(path);
    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const [metadata] = await file.getMetadata();
    const size = Number(metadata.size);
    const contentType = metadata.contentType ?? '';
    if (!Number.isSafeInteger(size) || size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 413 });
    }
    if (!ALLOWED_TYPES.has(contentType)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 415 });
    }

    const [contents] = await file.download();
    const body = new Uint8Array(contents.length);
    body.set(contents);
    return new NextResponse(body, {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Disposition': contentType === 'application/pdf' ? 'attachment' : 'inline',
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    console.error('GET /api/storage error:', err);
    return NextResponse.json({ error: 'Failed to load file' }, { status: 500 });
  }
}
