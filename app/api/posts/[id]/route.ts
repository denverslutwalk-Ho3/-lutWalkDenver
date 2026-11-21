import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../lib/firebase-admin';
import { requireAdmin, requireMemberOrAdmin } from '../../../../lib/authz';
import { deleteStorageObject } from '../../../../lib/storage-cleanup';
import { isPostStoragePath } from '../../../../lib/post-storage';
import { isForumCategory, normalizeForumCategory } from '../../../../lib/forum-categories';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireMemberOrAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  try {
    const db = getAdminDb();
    const doc = await db.collection('posts').doc(id).get();
    if (!doc.exists) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    const post: Record<string, unknown> & { id: string } = { id: doc.id, ...doc.data() };
    delete post.storageOwnerHash;
    post.category = normalizeForumCategory(post.category);
    return NextResponse.json({ post });
  } catch (err) {
    console.error('GET /api/posts/[id] error:', err);
    return NextResponse.json({ error: 'Failed to load post' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  try {
    const db = getAdminDb();
    const postDoc = await db.collection('posts').doc(id).get();
    const storagePath = postDoc.data()?.storagePath;
    if (isPostStoragePath(storagePath, id)) {
      await deleteStorageObject(storagePath);
    }
    // Firestore does not cascade subcollections; remove replies with their post.
    const replies = await db.collection('posts').doc(id).collection('replies').listDocuments();
    await Promise.all(replies.map((reply) => reply.delete()));
    await db.collection('posts').doc(id).delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/posts/[id] error:', err);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  try {
    const body = await request.json() as { pinned?: unknown; category?: unknown };
    const updates: Record<string, unknown> = {};
    if (typeof body.pinned === 'boolean') updates.pinned = body.pinned;
    if (typeof body.category === 'string') {
      if (body.category !== 'general' && !isForumCategory(body.category)) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
      }
      updates.category = body.category;
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }
    const db = getAdminDb();
    await db.collection('posts').doc(id).update(updates);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/posts/[id] error:', err);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}
