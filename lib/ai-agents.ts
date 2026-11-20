/**
 * Admin-managed AI assistant definitions. Agent records are written only by
 * admin-only API routes and are validated again on the server before storage.
 * The Mistral API key stays in server environment variables; nothing here is
 * sent to the browser except the name and description members need.
 */

import { DEFAULT_AGENT_PROMPT } from './ai-chat';

export const AGENT_COLLECTION = 'aiAgents';
export const DEFAULT_AGENT_ID = 'default';

export const MAX_AGENT_NAME_LENGTH = 80;
export const MAX_AGENT_DESCRIPTION_LENGTH = 300;
export const MAX_AGENT_PROMPT_LENGTH = 8000;

export type AgentFields = {
  name: string;
  description: string;
  systemPrompt: string;
};

export type AgentOption = {
  id: string;
  name: string;
  description: string;
  builtIn?: boolean;
  systemPrompt?: string;
};

/** The assistant members already had before the agent builder existed. */
export const DEFAULT_AGENT = {
  id: DEFAULT_AGENT_ID,
  name: 'Community peer-support assistant',
  description:
    'For any member who wants a grounded, trauma-informed conversation between organizing chats.',
  systemPrompt: DEFAULT_AGENT_PROMPT,
  builtIn: true,
} as const;

export type AgentValidationResult =
  | { ok: true; agent: AgentFields }
  | { ok: false; error: string };

// Control characters other than tab and newlines are rejected so stored prompts
// cannot smuggle terminal/display control sequences into logs or admin views.
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

/**
 * Validates and trims admin-supplied agent fields. Length limits are enforced
 * here (server-side) rather than trusted from the client.
 */
export function sanitizeAgentInput(input: unknown): AgentValidationResult {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, error: 'Invalid assistant data' };
  }

  const record = input as Record<string, unknown>;
  const name = typeof record.name === 'string' ? record.name.trim() : '';
  const description = typeof record.description === 'string' ? record.description.trim() : '';
  const systemPrompt = typeof record.systemPrompt === 'string' ? record.systemPrompt.trim() : '';

  if (!name) {
    return { ok: false, error: 'name is required' };
  }
  if (name.length > MAX_AGENT_NAME_LENGTH) {
    return { ok: false, error: `name must be ${MAX_AGENT_NAME_LENGTH} characters or fewer` };
  }
  if (!description) {
    return { ok: false, error: 'description is required' };
  }
  if (description.length > MAX_AGENT_DESCRIPTION_LENGTH) {
    return {
      ok: false,
      error: `description must be ${MAX_AGENT_DESCRIPTION_LENGTH} characters or fewer`,
    };
  }
  if (!systemPrompt) {
    return { ok: false, error: 'systemPrompt is required' };
  }
  if (systemPrompt.length > MAX_AGENT_PROMPT_LENGTH) {
    return { ok: false, error: `systemPrompt must be ${MAX_AGENT_PROMPT_LENGTH} characters or fewer` };
  }
  if (
    CONTROL_CHARACTERS.test(name)
    || CONTROL_CHARACTERS.test(description)
    || CONTROL_CHARACTERS.test(systemPrompt)
  ) {
    return { ok: false, error: 'Assistant text contains unsupported control characters' };
  }

  return { ok: true, agent: { name, description, systemPrompt } };
}

/** Firestore document ids are opaque, but only accept simple ids in routes. */
export function isValidAgentId(id: unknown): id is string {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(id);
}
