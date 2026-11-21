import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../../../lib/firebase-admin';
import { requireAdmin } from '../../../../../../lib/authz';
import { FieldValue } from 'firebase-admin/firestore';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; replyId: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id, replyId } = await params;
  try {
    const db = getAdminDb();
    const postRef = db.collection('posts').doc(id);
    const replyRef = postRef.collection('replies').doc(replyId);
    const deleted = await db.runTransaction(async (transaction) => {
      const reply = await transaction.get(replyRef);
      if (!reply.exists) return false;
      transaction.delete(replyRef);
      transaction.update(postRef, { replyCount: FieldValue.increment(-1) });
      return true;
    });
    if (!deleted) return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/posts/[id]/replies/[replyId] error:', err);
    return NextResponse.json({ error: 'Failed to delete reply' }, { status: 500 });
  }
}
