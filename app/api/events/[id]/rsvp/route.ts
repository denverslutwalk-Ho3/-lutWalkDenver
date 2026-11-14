import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../../lib/firebase-admin';
import { requireMemberOrAdmin } from '../../../../../lib/authz';
import { FieldValue } from 'firebase-admin/firestore';
import { normalizeEventRsvps, RSVP_STATUSES, type RsvpStatus } from '../../../../../lib/event-rsvps';

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
    const body: unknown = await request.json();
    const status = body && typeof body === 'object' && !Array.isArray(body)
      ? (body as { status?: unknown }).status
      : undefined;
    if (typeof status !== 'string' || !RSVP_STATUSES.includes(status as RsvpStatus)) {
      return NextResponse.json({ error: 'Invalid RSVP status' }, { status: 400 });
    }

    const db = getAdminDb();
    const eventRef = db.collection('events').doc(id);
    const updated = await db.runTransaction(async (transaction) => {
      const event = await transaction.get(eventRef);
      if (!event.exists) return false;

      const rsvps = normalizeEventRsvps(event.get('rsvps'));
      transaction.update(eventRef, {
        rsvps: {
          ...rsvps,
          [session.role]: {
            status,
            updatedAt: FieldValue.serverTimestamp(),
          },
        },
      });
      return true;
    });
    if (!updated) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/events/[id]/rsvp error:', err);
    return NextResponse.json({ error: 'Failed to RSVP' }, { status: 500 });
  }
}
