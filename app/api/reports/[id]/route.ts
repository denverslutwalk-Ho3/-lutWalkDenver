import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '../../../../lib/firebase-admin';
import { requireAdmin } from '../../../../lib/authz';
import { isReportStatus } from '../../../../lib/reporting';
import { readBodyWithinLimit } from '../../../../lib/bounded-body';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  try {
    const contentLength = Number(request.headers.get('content-length') ?? '0');
    if (Number.isFinite(contentLength) && contentLength > 8_192) {
      return NextResponse.json({ error: 'Update is too large' }, { status: 413 });
    }
    const bodyBytes = await readBodyWithinLimit(request.body, 8_192);
    if (!bodyBytes) {
      return NextResponse.json({ error: 'Update is too large' }, { status: 413 });
    }
    const body = JSON.parse(new TextDecoder().decode(bodyBytes)) as {
      status?: unknown;
      resolutionNotes?: unknown;
    };
    if (!isReportStatus(body.status)) {
      return NextResponse.json({ error: 'Invalid report status' }, { status: 400 });
    }
    const resolutionNotes = typeof body.resolutionNotes === 'string'
      ? body.resolutionNotes.trim()
      : '';
    if (resolutionNotes.length > 4000) {
      return NextResponse.json({ error: 'Resolution notes are too long' }, { status: 400 });
    }
    if ((body.status === 'resolved' || body.status === 'dismissed') && !resolutionNotes) {
      return NextResponse.json({ error: 'Resolution notes are required for a final status' }, { status: 400 });
    }

    const db = getAdminDb();
    const ref = db.collection('reports').doc(id);
    const updated = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(ref);
      if (!doc.exists) return 'not_found' as const;
      const currentStatus = doc.data()?.status;
      const allowedTransition =
        currentStatus === 'open'
          ? body.status === 'reviewing' || body.status === 'resolved' || body.status === 'dismissed'
          : currentStatus === 'reviewing'
            ? body.status === 'resolved' || body.status === 'dismissed'
            : false;
      if (!allowedTransition) return 'invalid_transition' as const;
      transaction.update(ref, {
        status: body.status,
        resolutionNotes,
        resolvedAt: body.status === 'resolved' || body.status === 'dismissed'
          ? FieldValue.serverTimestamp()
          : null,
        updatedAt: FieldValue.serverTimestamp(),
      });
      const auditRef = ref.collection('audit').doc();
      transaction.set(auditRef, {
        action: 'status_changed',
        fromStatus: doc.data()?.status ?? 'unknown',
        toStatus: body.status,
        resolutionNotes,
        actorRole: 'admin',
        createdAt: FieldValue.serverTimestamp(),
      });
      return 'ok' as const;
    });
    if (updated === 'not_found') return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    if (updated === 'invalid_transition') {
      return NextResponse.json({ error: 'Report status transition is not allowed' }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid report update' }, { status: 400 });
    }
    console.error('PATCH /api/reports/[id] error:', err);
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
  }
}
