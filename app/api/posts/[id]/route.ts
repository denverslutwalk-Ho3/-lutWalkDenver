import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../lib/firebase-admin';
import { requireAdmin } from '../../../../lib/authz';
import { deleteStorageObject } from '../../../../lib/storage-cleanup';
import { isPostStoragePath } from '../../../../lib/post-storage';

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
    const body = await request.json() as { pinned?: unknown };
    const updates: Record<string, unknown> = {};
    if (typeof body.pinned === 'boolean') updates.pinned = body.pinned;
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
