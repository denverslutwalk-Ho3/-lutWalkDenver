import { NextResponse } from 'next/server';
import { getAdminDb, getAdminStorage } from '../../../lib/firebase-admin';
import { requireMemberOrAdmin } from '../../../lib/authz';
import { FieldValue, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { readBodyWithinLimit } from '../../../lib/bounded-body';
import { deleteStorageObject } from '../../../lib/storage-cleanup';
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_FILE_SIZE, MAX_UPLOAD_REQUEST_SIZE } from '../../../lib/upload-constraints';
import { isForumCategory, normalizeForumCategory } from '../../../lib/forum-categories';

export async function GET(request: Request) {
  if (!(await requireMemberOrAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get('limit') ?? '20');
  const limit = Math.min(Math.max(1, limitParam), 100);

  try {
    const db = getAdminDb();
    const snap = await db
      .collection('posts')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const posts = snap.docs.map((doc: QueryDocumentSnapshot) => {
      const post: Record<string, unknown> & { id: string } = { id: doc.id, ...doc.data() };
      delete post.storageOwnerHash;
      post.category = normalizeForumCategory(post.category);
      return post;
    }).sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
      const aSeconds = typeof a.createdAt === 'object' && a.createdAt && '_seconds' in a.createdAt
        ? Number((a.createdAt as { _seconds: number })._seconds)
        : 0;
      const bSeconds = typeof b.createdAt === 'object' && b.createdAt && '_seconds' in b.createdAt
        ? Number((b.createdAt as { _seconds: number })._seconds)
        : 0;
      return bSeconds - aSeconds;
    });
    return NextResponse.json({ posts });
  } catch (err) {
    console.error('GET /api/posts error:', err);
    return NextResponse.json({ error: 'Failed to load posts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await requireMemberOrAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const contentLength = Number(request.headers.get('content-length') ?? '0');
    if (Number.isFinite(contentLength) && contentLength > MAX_UPLOAD_REQUEST_SIZE) {
      return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 413 });
    }
    const body = await readBodyWithinLimit(request.body, MAX_UPLOAD_REQUEST_SIZE);
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

    const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() ?? '';
    let titleValue: unknown;
    let textValue: unknown;
    let categoryValue: unknown = 'general';
    let file: File | null = null;
    if (contentType === 'multipart/form-data') {
      const formData = await boundedRequest.formData();
      if (formData.has('storagePath') || formData.has('imageUrl')) {
        return NextResponse.json({ error: 'Post image paths are assigned by the server' }, { status: 400 });
      }
      titleValue = formData.get('title');
      textValue = formData.get('text');
      categoryValue = formData.get('category');
      const fileField = formData.get('file');
      if (fileField !== null && !(fileField instanceof File)) {
        return NextResponse.json({ error: 'Invalid post image' }, { status: 400 });
      }
      file = fileField instanceof File ? fileField : null;
    } else if (contentType === 'application/json') {
      const parsed: unknown = await boundedRequest.json();
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return NextResponse.json({ error: 'Invalid post data' }, { status: 400 });
      }
      const json = parsed as Record<string, unknown>;
      if ('storagePath' in json || 'imageUrl' in json) {
        return NextResponse.json({ error: 'Post image paths are assigned by the server' }, { status: 400 });
      }
      titleValue = json.title;
      textValue = json.text;
      categoryValue = json.category;
    } else {
      return NextResponse.json({ error: 'Expected JSON or multipart form data' }, { status: 415 });
    }

    const title = typeof titleValue === 'string' ? titleValue.trim() : '';
    const text = typeof textValue === 'string' ? textValue.trim() : '';
    const category = typeof categoryValue === 'string' ? categoryValue : 'general';

    if (!title || !text) {
      return NextResponse.json({ error: 'title and text are required' }, { status: 400 });
    }
    if (title.length > 200 || text.length > 10000) {
      return NextResponse.json({ error: 'Post is too long' }, { status: 400 });
    }
    if (category !== 'general' && !isForumCategory(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }
    if (file && file.size > MAX_UPLOAD_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 413 });
    }
    if (file && !ALLOWED_UPLOAD_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 415 });
    }

    const db = getAdminDb();
    const ref = db.collection('posts').doc();
    let storagePath: string | null = null;
    let imageUrl: string | null = null;
    if (file) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200) || 'upload';
      storagePath = `posts/${ref.id}/${Date.now()}-${safeName}`;
      const fileRef = getAdminStorage().bucket().file(storagePath);
      try {
        await fileRef.save(Buffer.from(await file.arrayBuffer()), {
          metadata: { contentType: file.type },
          resumable: false,
        });
      } catch (err) {
        try {
          await deleteStorageObject(storagePath);
        } catch (cleanupError) {
          console.error('POST /api/posts upload cleanup error:', cleanupError);
        }
        throw err;
      }
      imageUrl = `/api/storage?path=${encodeURIComponent(storagePath)}`;
    }

    try {
      await ref.set({
        title,
        text,
        category,
        imageUrl,
        storagePath,
        pinned: false,
        reactions: {},
        replyCount: 0,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      if (storagePath) {
        try {
          const createdPost = await ref.get();
          if (!createdPost.exists) await deleteStorageObject(storagePath);
        } catch (cleanupError) {
          console.error('POST /api/posts document cleanup error:', cleanupError);
        }
      }
      throw err;
    }

    return NextResponse.json({ id: ref.id }, { status: 201 });
  } catch (err) {
    console.error('POST /api/posts error:', err);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
