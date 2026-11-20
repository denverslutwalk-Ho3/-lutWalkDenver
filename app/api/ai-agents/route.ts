import { NextResponse } from 'next/server';
import { FieldValue, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getAdminDb } from '../../../lib/firebase-admin';
import { requireAdmin, requireMemberOrAdmin } from '../../../lib/authz';
import {
  AGENT_COLLECTION,
  DEFAULT_AGENT,
  sanitizeAgentInput,
} from '../../../lib/ai-agents';

export async function GET() {
  const session = await requireMemberOrAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Members only need names and descriptions to pick an assistant; prompts are
  // returned to admins, who are the only ones allowed to edit them.
  const includePrompts = session.role === 'admin';

  try {
    const db = getAdminDb();
    const snap = await db.collection(AGENT_COLLECTION).orderBy('createdAt', 'desc').get();

    const agents = snap.docs.map((doc: QueryDocumentSnapshot) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: typeof data.name === 'string' ? data.name : 'Untitled assistant',
        description: typeof data.description === 'string' ? data.description : '',
        builtIn: false,
        ...(includePrompts
          ? { systemPrompt: typeof data.systemPrompt === 'string' ? data.systemPrompt : '' }
          : {}),
      };
    });

    return NextResponse.json({
      agents: [
        {
          id: DEFAULT_AGENT.id,
          name: DEFAULT_AGENT.name,
          description: DEFAULT_AGENT.description,
          builtIn: true,
          ...(includePrompts ? { systemPrompt: DEFAULT_AGENT.systemPrompt } : {}),
        },
        ...agents,
      ],
    });
  } catch (err) {
    console.error('GET /api/ai-agents error:', err);
    return NextResponse.json({ error: 'Failed to load assistants' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 });
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
    const ref = await db.collection(AGENT_COLLECTION).add({
      ...result.agent,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ id: ref.id }, { status: 201 });
  } catch (err) {
    console.error('POST /api/ai-agents error:', err);
    return NextResponse.json({ error: 'Failed to create assistant' }, { status: 500 });
  }
}
