import { NextResponse } from 'next/server';
import { requireMemberOrAdmin } from '../../../../lib/authz';
import { getChatRoomKey } from '../../../../lib/chat-key';

export async function GET() {
  if (!(await requireMemberOrAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    return NextResponse.json(
      { key: getChatRoomKey() },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    console.error('GET /api/messages/key error:', err);
    return NextResponse.json({ error: 'Chat is not configured' }, { status: 500 });
  }
}
