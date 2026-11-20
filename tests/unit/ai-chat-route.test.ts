import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireMemberOrAdmin: vi.fn(),
  getAdminDb: vi.fn(),
}));

vi.mock('../../lib/authz', () => ({
  requireMemberOrAdmin: mocks.requireMemberOrAdmin,
}));
vi.mock('../../lib/firebase-admin', () => ({
  getAdminDb: mocks.getAdminDb,
}));

import { POST } from '../../app/api/ai-chat/route';
import { AGENT_GUARDRAILS } from '../../lib/ai-chat';

type MistralBody = {
  messages: Array<{ role: string; content: string }>;
};

function requestWith(body: unknown) {
  return new Request('http://localhost/api/ai-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/ai-chat agent selection', () => {
  const fetchMock = vi.fn();
  const originalApiKey = process.env.MISTRAL_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireMemberOrAdmin.mockResolvedValue({ role: 'member', claims: {} });
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Hello there' } }] }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalApiKey === undefined) {
      delete process.env.MISTRAL_API_KEY;
    } else {
      process.env.MISTRAL_API_KEY = originalApiKey;
    }
  });

  it('rejects unauthenticated requests', async () => {
    mocks.requireMemberOrAdmin.mockResolvedValue(null);

    const response = await POST(requestWith({ messages: [{ role: 'user', content: 'hi' }] }));

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses the built-in guardrails when no agent is selected', async () => {
    process.env.MISTRAL_API_KEY = 'test-key';

    const response = await POST(requestWith({ messages: [{ role: 'user', content: 'hi' }] }));

    expect(response.status).toBe(200);
    const [, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    const body = JSON.parse(init.body) as MistralBody;
    expect(body.messages[0]).toEqual({ role: 'system', content: AGENT_GUARDRAILS });
  });

  it('loads the selected agent and still prepends the guardrails', async () => {
    process.env.MISTRAL_API_KEY = 'test-key';
    mocks.getAdminDb.mockReturnValue({
      collection: () => ({
        doc: () => ({
          get: async () => ({
            exists: true,
            data: () => ({ systemPrompt: 'Focus on zine submissions.' }),
          }),
        }),
      }),
    });

    const response = await POST(requestWith({
      messages: [{ role: 'user', content: 'hi' }],
      agentId: 'agent-1',
    }));

    expect(response.status).toBe(200);
    const [, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    const body = JSON.parse(init.body) as MistralBody;
    expect(body.messages[0].content.startsWith(AGENT_GUARDRAILS)).toBe(true);
    expect(body.messages[0].content).toContain('Focus on zine submissions.');
  });

  it('rejects an unknown agent instead of falling back silently', async () => {
    process.env.MISTRAL_API_KEY = 'test-key';
    mocks.getAdminDb.mockReturnValue({
      collection: () => ({
        doc: () => ({
          get: async () => ({ exists: false, data: () => undefined }),
        }),
      }),
    });

    const response = await POST(requestWith({
      messages: [{ role: 'user', content: 'hi' }],
      agentId: 'missing-agent',
    }));

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
