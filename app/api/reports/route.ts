import { NextResponse } from 'next/server';
import { FieldValue, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getAdminDb } from '../../../lib/firebase-admin';
import { requireAdmin, requireMemberOrAdmin } from '../../../lib/authz';
import { isReportReason } from '../../../lib/reporting';
import { readBodyWithinLimit } from '../../../lib/bounded-body';

const MAX_DETAILS_LENGTH = 2000;

export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const limit = Math.min(Math.max(Number(new URL(request.url).searchParams.get('limit') ?? '50'), 1), 100);
  try {
    const snap = await getAdminDb()
      .collection('reports')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    const reports = snap.docs.map((doc: QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return NextResponse.json({ reports });
  } catch (err) {
    console.error('GET /api/reports error:', err);
    return NextResponse.json({ error: 'Failed to load reports' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await requireMemberOrAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const contentLength = Number(request.headers.get('content-length') ?? '0');
    if (Number.isFinite(contentLength) && contentLength > 16_384) {
      return NextResponse.json({ error: 'Report is too large' }, { status: 413 });
    }
    const bodyBytes = await readBodyWithinLimit(request.body, 16_384);
    if (!bodyBytes) {
      return NextResponse.json({ error: 'Report is too large' }, { status: 413 });
    }
    const body = JSON.parse(new TextDecoder().decode(bodyBytes)) as {
      targetType?: unknown;
      targetId?: unknown;
      parentPostId?: unknown;
      reason?: unknown;
      details?: unknown;
    };
    if (body.targetType !== 'post' && body.targetType !== 'reply') {
      return NextResponse.json({ error: 'Invalid report target type' }, { status: 400 });
    }
    if (typeof body.targetId !== 'string' || !body.targetId.trim() || body.targetId.length > 128) {
      return NextResponse.json({ error: 'Invalid report target' }, { status: 400 });
    }
    if (!isReportReason(body.reason)) {
      return NextResponse.json({ error: 'Invalid report reason' }, { status: 400 });
    }
    const details = typeof body.details === 'string' ? body.details.trim() : '';
    if (details.length > MAX_DETAILS_LENGTH) {
      return NextResponse.json({ error: 'Report details are too long' }, { status: 400 });
    }

    const db = getAdminDb();
    const targetId = body.targetId.trim();
    let targetExists = false;
    if (body.targetType === 'post') {
      targetExists = (await db.collection('posts').doc(targetId).get()).exists;
    } else {
      if (typeof body.parentPostId !== 'string' || !body.parentPostId.trim() || body.parentPostId.length > 128) {
        return NextResponse.json({ error: 'Invalid report context' }, { status: 400 });
      }
      targetExists = (await db
        .collection('posts')
        .doc(body.parentPostId.trim())
        .collection('replies')
        .doc(targetId)
        .get()).exists;
    }
    if (!targetExists) {
      return NextResponse.json({ error: 'Reported content not found' }, { status: 404 });
    }

    const ref = db.collection('reports').doc();
    await ref.set({
      targetType: body.targetType,
      targetId,
      parentPostId: body.targetType === 'reply'
        ? (body.parentPostId as string).trim()
        : null,
      reason: body.reason,
      details,
      status: 'open',
      resolutionNotes: '',
      reporterRole: session.role,
      createdAt: FieldValue.serverTimestamp(),
    });
    await ref.collection('audit').doc().set({
      action: 'submitted',
      actorRole: session.role,
      createdAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ id: ref.id }, { status: 201 });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid report data' }, { status: 400 });
    }
    console.error('POST /api/reports error:', err);
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }
}
