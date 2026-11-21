import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../lib/firebase-admin';
import { requireAdmin } from '../../../../lib/authz';

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
    await db.collection('events').doc(id).delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/events/[id] error:', err);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
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
    const body = await request.json() as Record<string, unknown>;
    const updates: Record<string, unknown> = {};
    for (const key of ['title', 'date', 'time', 'location', 'description']) {
      if (typeof body[key] === 'string') updates[key] = (body[key] as string).trim();
    }
    if (typeof body.archived === 'boolean') updates.archived = body.archived;
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }
    const db = getAdminDb();
    await db.collection('events').doc(id).update(updates);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/events/[id] error:', err);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}
