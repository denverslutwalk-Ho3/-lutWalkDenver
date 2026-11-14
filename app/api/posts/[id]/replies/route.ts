import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../../lib/firebase-admin';
import { requireMemberOrAdmin } from '../../../../../lib/authz';
import { FieldValue, type QueryDocumentSnapshot } from 'firebase-admin/firestore';

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
    const snap = await db.collection('posts').doc(id).collection('replies').orderBy('createdAt', 'asc').get();
    const replies = snap.docs.map((doc: QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ replies });
  } catch (err) {
    console.error('GET /api/posts/[id]/replies error:', err);
    return NextResponse.json({ error: 'Failed to load replies' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireMemberOrAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  try {
    const body = await request.json() as { text?: unknown; sender?: unknown };
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    // The sender label comes from the session role, never from the client.
    const sender = session.role === 'admin' ? 'Organizer' : 'Member';
    if (!text) return NextResponse.json({ error: 'text is required' }, { status: 400 });
    if (text.length > 4000) {
      return NextResponse.json({ error: 'Reply is too long (4000 characters max)' }, { status: 400 });
    }
    const db = getAdminDb();
    const postRef = db.collection('posts').doc(id);
    const replyRef = postRef.collection('replies').doc();
    const created = await db.runTransaction(async (transaction) => {
      const post = await transaction.get(postRef);
      if (!post.exists) return false;

      transaction.create(replyRef, {
        text,
        sender,
        createdAt: FieldValue.serverTimestamp(),
      });
      transaction.update(postRef, { replyCount: FieldValue.increment(1) });
      return true;
    });
    if (!created) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    return NextResponse.json({ id: replyRef.id }, { status: 201 });
  } catch (err) {
    console.error('POST /api/posts/[id]/replies error:', err);
    return NextResponse.json({ error: 'Failed to create reply' }, { status: 500 });
  }
}
