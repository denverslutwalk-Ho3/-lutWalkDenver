import { NextResponse } from 'next/server';
import { requireMemberOrAdmin } from '../../../lib/authz';
import {
  AI_CHAT_MODEL,
  SYSTEM_PROMPT,
  sanitizeChatHistory,
  type AiChatMessage,
} from '../../../lib/ai-chat';

const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 30_000;

export async function POST(request: Request) {
  if (!(await requireMemberOrAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'The AI assistant is not configured yet. Contact an organizer.' },
      { status: 503 },
    );
  }

  try {
    const body = await request.json() as { messages?: unknown };
    const history = sanitizeChatHistory(body.messages);

    if (!history.ok) {
      return NextResponse.json({ error: history.error }, { status: 400 });
    }

    // The conversation is forwarded to Mistral for this single request and is
    // not stored or logged by this application.
    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      body: JSON.stringify({
        model: AI_CHAT_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...history.messages,
        ] as Array<{ role: string; content: string }>,
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      // Log only the status code, never request or response content.
      console.error(`POST /api/ai-chat: Mistral request failed with status ${response.status}`);
      return NextResponse.json(
        { error: 'The AI assistant is unavailable right now. Try again in a moment.' },
        { status: 502 },
      );
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const reply = data.choices?.[0]?.message?.content;

    if (typeof reply !== 'string' || !reply.trim()) {
      console.error('POST /api/ai-chat: Mistral returned an empty completion');
      return NextResponse.json(
        { error: 'The AI assistant returned an empty response. Try again.' },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { reply: reply.trim() },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      return NextResponse.json(
        { error: 'The AI assistant took too long to respond. Try again.' },
        { status: 504 },
      );
    }
    console.error('POST /api/ai-chat error:', err);
    return NextResponse.json({ error: 'Failed to get a response' }, { status: 500 });
  }
}
