import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '../../../lib/firebase-admin';
import { requireMemberOrAdmin } from '../../../lib/authz';
import { readBodyWithinLimit } from '../../../lib/bounded-body';

export async function POST(request: Request) {
  const session = await requireMemberOrAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const contentLength = Number(request.headers.get('content-length') ?? '0');
    if (Number.isFinite(contentLength) && contentLength > 1024) {
      return NextResponse.json({ error: 'Request is too large' }, { status: 413 });
    }
    const bodyBytes = await readBodyWithinLimit(request.body, 1024);
    if (!bodyBytes) {
      return NextResponse.json({ error: 'Request is too large' }, { status: 413 });
    }
    const body = JSON.parse(new TextDecoder().decode(bodyBytes)) as { accepted?: unknown };
    if (body.accepted !== true) {
      return NextResponse.json({ error: 'The community agreement must be accepted' }, { status: 400 });
    }
    await getAdminDb().collection('communityAgreementAcceptances').add({
      role: session.role,
      accepted: true,
      acceptedAt: FieldValue.serverTimestamp(),
      agreementVersion: '1',
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }
    console.error('POST /api/community-agreement error:', err);
    return NextResponse.json({ error: 'Failed to record agreement' }, { status: 500 });
  }
}
