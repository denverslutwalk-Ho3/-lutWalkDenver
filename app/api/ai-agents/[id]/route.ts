import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '../../../../lib/firebase-admin';
import { requireAdmin } from '../../../../lib/authz';
import {
  AGENT_COLLECTION,
  DEFAULT_AGENT_ID,
  isValidAgentId,
  sanitizeAgentInput,
} from '../../../../lib/ai-agents';

type RouteContext = { params: Promise<{ id: string }> };

async function readId(context: RouteContext) {
  const { id } = await context.params;
  return id;
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 });
  }

  const id = await readId(context);
  if (!isValidAgentId(id)) {
    return NextResponse.json({ error: 'Invalid assistant id' }, { status: 400 });
  }
  if (id === DEFAULT_AGENT_ID) {
    return NextResponse.json({ error: 'The built-in assistant cannot be changed' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = sanitizeAgentInput(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const ref = db.collection(AGENT_COLLECTION).doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Assistant not found' }, { status: 404 });
    }

    await ref.update({
      ...result.agent,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/ai-agents/[id] error:', err);
    return NextResponse.json({ error: 'Failed to update assistant' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 });
  }

  const id = await readId(context);
  if (!isValidAgentId(id)) {
    return NextResponse.json({ error: 'Invalid assistant id' }, { status: 400 });
  }
  if (id === DEFAULT_AGENT_ID) {
    return NextResponse.json({ error: 'The built-in assistant cannot be deleted' }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const ref = db.collection(AGENT_COLLECTION).doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Assistant not found' }, { status: 404 });
    }

    await ref.delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/ai-agents/[id] error:', err);
    return NextResponse.json({ error: 'Failed to delete assistant' }, { status: 500 });
  }
}
