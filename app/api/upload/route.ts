import { NextResponse } from 'next/server';
import { getAdminStorage } from '../../../lib/firebase-admin';
import { getServerSession } from '../../../lib/authz';
import { readBodyWithinLimit } from '../../../lib/bounded-body';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
// Allowance for multipart boundaries and form fields around the file itself.
const MAX_UPLOAD_OVERHEAD = 1024 * 1024;
const MAX_REQUEST_SIZE = MAX_FILE_SIZE + MAX_UPLOAD_OVERHEAD;
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
]);
const ALLOWED_FOLDERS = new Set(['archive', 'bulletin', 'community', 'posts', 'products']);
const ADMIN_ONLY_FOLDERS = new Set(['archive', 'community', 'products']);

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Reject oversized uploads before parsing the body into formData.
    const contentLength = Number(request.headers.get('content-length') ?? '0');
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_SIZE) {
      return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 413 });
    }

    const body = await readBodyWithinLimit(request.body, MAX_REQUEST_SIZE);
    if (!body) {
      return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 413 });
    }
    const requestBody = new ArrayBuffer(body.byteLength);
    new Uint8Array(requestBody).set(body);
    const boundedRequest = new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: requestBody,
    });
    const formData = await boundedRequest.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file field is required' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 413 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 415 });
    }

    const requestedFolder = formData.get('folder');
    const folder = typeof requestedFolder === 'string' ? requestedFolder : 'bulletin';
    const folderParts = folder.split('/');

    if (
      folderParts.length === 0
      || folderParts.some((part) => !/^[a-zA-Z0-9_-][a-zA-Z0-9._-]*$/.test(part) || part === '.' || part === '..')
      || !ALLOWED_FOLDERS.has(folderParts[0] ?? '')
    ) {
      return NextResponse.json({ error: 'Unsupported upload folder' }, { status: 400 });
    }

    if (ADMIN_ONLY_FOLDERS.has(folderParts[0] ?? '') && session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — admin access required for this upload folder' }, { status: 403 });
    }
    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const storagePath = `${folder}/${safeName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const bucket = getAdminStorage().bucket();
    const fileRef = bucket.file(storagePath);

    await fileRef.save(buffer, {
      metadata: { contentType: file.type },
      resumable: false,
    });

    const privateUrl = `/api/storage?path=${encodeURIComponent(storagePath)}`;

    return NextResponse.json({ url: privateUrl, path: storagePath }, { status: 201 });
  } catch (err) {
    console.error('POST /api/upload error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
