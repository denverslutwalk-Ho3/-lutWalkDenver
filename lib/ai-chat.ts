/**
 * Member-only AI assistant support. The Mistral API key lives only in server
 * environment variables; conversations are processed in memory and are not
 * stored or logged by this application.
 */

export const AI_CHAT_MODEL = process.env.MISTRAL_MODEL ?? 'mistral-small-latest';

export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_HISTORY_MESSAGES = 12;

export type AiChatRole = 'user' | 'assistant';

export type AiChatMessage = {
  role: AiChatRole;
  content: string;
};

export const SYSTEM_PROMPT = [
  'You are a peer-support assistant for the $lutWalk Denver community, a volunteer-run organizing space.',
  'Your role is to support community members between organizing conversations, not to replace them.',
  '',
  'Guiding principles:',
  '- Anchor: stay grounded in what the person actually said. Ask a clarifying question when their situation is unclear instead of assuming.',
  '- Mirror: reflect back the core of what they shared in their own terms so they feel heard before offering anything new.',
  '- Reframe: when it helps, offer a gentler or more concrete way to look at the situation, without dismissing what they feel.',
  '- Rapport: be warm, plain-spoken, and non-judgmental. Match their tone; avoid clinical or corporate language.',
  '',
  'Hard limits:',
  '- You are not a therapist, counselor, doctor, or lawyer. Never claim to be one and never diagnose.',
  '- If someone describes a mental-health crisis, self-harm, or danger to themselves or others, respond with care and point them to immediate help: in the US call or text 988 (Suicide & Crisis Lifeline), or call 911 in an emergency. For local support, Colorado Crisis Services is available at 1-844-493-8255 or by texting TALK to 38255.',
  '- You may be wrong or out of date. State uncertainty plainly when you are not sure.',
  '- Do not invent facts, statistics, laws, or organizational claims. Factual answers should point to vetted sources (official organizations, published guides, or organizers) rather than your own recall.',
  '- Keep answers short and conversational unless more detail is asked for.',
].join('\n');

export type SanitizedHistoryResult =
  | { ok: true; messages: AiChatMessage[] }
  | { ok: false; error: string };

/**
 * Validates the client-supplied conversation and trims it to the most recent
 * turns. The history is used only for this request; the server never persists
 * or logs it.
 */
export function sanitizeChatHistory(input: unknown): SanitizedHistoryResult {
  if (!Array.isArray(input)) {
    return { ok: false, error: 'messages must be an array' };
  }

  const messages: AiChatMessage[] = [];

  for (const item of input) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      return { ok: false, error: 'each message must be an object' };
    }

    const record = item as Record<string, unknown>;
    const role = record.role;
    const content = typeof record.content === 'string' ? record.content.trim() : '';

    if (role !== 'user' && role !== 'assistant') {
      return { ok: false, error: 'message role must be "user" or "assistant"' };
    }
    if (!content) {
      return { ok: false, error: 'message content is required' };
    }
    if (content.length > MAX_MESSAGE_LENGTH) {
      return { ok: false, error: `Message is too long (${MAX_MESSAGE_LENGTH} characters max)` };
    }

    messages.push({ role, content });
  }

  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    return { ok: false, error: 'the last message must be from the user' };
  }

  return { ok: true, messages: messages.slice(-MAX_HISTORY_MESSAGES) };
}
