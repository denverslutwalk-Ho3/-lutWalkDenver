import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  requireMemberOrAdmin: vi.fn(),
  getAdminDb: vi.fn(),
}));

vi.mock('../../lib/authz', () => ({
  requireAdmin: mocks.requireAdmin,
  requireMemberOrAdmin: mocks.requireMemberOrAdmin,
}));
vi.mock('../../lib/firebase-admin', () => ({
  getAdminDb: mocks.getAdminDb,
}));

import { GET, POST } from '../../app/api/ai-agents/route';
import { DELETE, PATCH } from '../../app/api/ai-agents/[id]/route';

type AgentsBody = {
  agents: Array<Record<string, unknown>>;
};

describe('/api/ai-agents', () => {
  const add = vi.fn();
  const get = vi.fn();
  const update = vi.fn();
  const remove = vi.fn();
  const listGet = vi.fn();
  const doc = vi.fn(() => ({ get, update, delete: remove }));
  const collection = {
    add,
    doc,
    orderBy: vi.fn(() => ({ get: listGet })),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ role: 'admin', claims: {} });
    mocks.requireMemberOrAdmin.mockResolvedValue({ role: 'member', claims: {} });
    mocks.getAdminDb.mockReturnValue({ collection: () => collection });
    add.mockResolvedValue({ id: 'new-agent' });
    listGet.mockResolvedValue({ docs: [] });
    get.mockResolvedValue({ exists: true, data: () => ({}) });
    update.mockResolvedValue(undefined);
    remove.mockResolvedValue(undefined);
  });

  describe('GET', () => {
    it('rejects unauthenticated requests', async () => {
      mocks.requireMemberOrAdmin.mockResolvedValue(null);

      const response = await GET();

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'Unauthorized' });
    });

    it('returns the built-in assistant and custom agents without prompts to members', async () => {
      listGet.mockResolvedValue({
        docs: [
          {
            id: 'agent-1',
            data: () => ({ name: 'Organizer coach', description: 'For leads', systemPrompt: 'Secret prompt' }),
          },
        ],
      });

      const response = await GET();
      const json = await response.json() as AgentsBody;

      expect(response.status).toBe(200);
      expect(json.agents).toHaveLength(2);
      expect(json.agents[0]).toMatchObject({ id: 'default', builtIn: true });
      expect(json.agents[1]).toEqual({
        id: 'agent-1',
        name: 'Organizer coach',
        description: 'For leads',
        builtIn: false,
      });
      expect('systemPrompt' in json.agents[1]).toBe(false);
    });

    it('returns prompts to admins', async () => {
      mocks.requireMemberOrAdmin.mockResolvedValue({ role: 'admin', claims: {} });
      listGet.mockResolvedValue({
        docs: [
          {
            id: 'agent-1',
            data: () => ({ name: 'Organizer coach', description: 'For leads', systemPrompt: 'Stored prompt' }),
          },
        ],
      });

      const response = await GET();
      const json = await response.json() as AgentsBody;

      expect(response.status).toBe(200);
      expect(json.agents[0].systemPrompt).toEqual(expect.any(String));
      expect(json.agents[1].systemPrompt).toBe('Stored prompt');
    });
  });

  describe('POST', () => {
    it('rejects member sessions', async () => {
      mocks.requireAdmin.mockResolvedValue(null);

      const response = await POST(new Request('http://localhost/api/ai-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'A', description: 'B', systemPrompt: 'C' }),
      }));

      expect(response.status).toBe(403);
      expect(add).not.toHaveBeenCalled();
    });

    it('rejects invalid input before writing', async () => {
      const response = await POST(new Request('http://localhost/api/ai-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'A', description: 'B' }),
      }));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'systemPrompt is required' });
      expect(add).not.toHaveBeenCalled();
    });

    it('creates an agent for an admin session', async () => {
      const response = await POST(new Request('http://localhost/api/ai-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '  Organizer coach ',
          description: ' For leads ',
          systemPrompt: ' Help leads plan. ',
        }),
      }));

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ id: 'new-agent' });
      expect(add).toHaveBeenCalledWith({
        name: 'Organizer coach',
        description: 'For leads',
        systemPrompt: 'Help leads plan.',
        createdAt: expect.anything(),
        updatedAt: expect.anything(),
      });
    });
  });

  describe('PATCH /api/ai-agents/[id]', () => {
    const context = { params: Promise.resolve({ id: 'agent-1' }) };

    it('rejects member sessions', async () => {
      mocks.requireAdmin.mockResolvedValue(null);

      const response = await PATCH(new Request('http://localhost/api/ai-agents/agent-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'A', description: 'B', systemPrompt: 'C' }),
      }), context);

      expect(response.status).toBe(403);
      expect(update).not.toHaveBeenCalled();
    });

    it('refuses to change the built-in assistant', async () => {
      const response = await PATCH(new Request('http://localhost/api/ai-agents/default', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'A', description: 'B', systemPrompt: 'C' }),
      }), { params: Promise.resolve({ id: 'default' }) });

      expect(response.status).toBe(400);
      expect(update).not.toHaveBeenCalled();
    });

    it('returns 404 when the agent does not exist', async () => {
      get.mockResolvedValue({ exists: false, data: () => undefined });

      const response = await PATCH(new Request('http://localhost/api/ai-agents/agent-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'A', description: 'B', systemPrompt: 'C' }),
      }), context);

      expect(response.status).toBe(404);
      expect(update).not.toHaveBeenCalled();
    });

    it('updates an agent for an admin session', async () => {
      const response = await PATCH(new Request('http://localhost/api/ai-agents/agent-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'A', description: 'B', systemPrompt: 'C' }),
      }), context);

      expect(response.status).toBe(200);
      expect(update).toHaveBeenCalledWith({
        name: 'A',
        description: 'B',
        systemPrompt: 'C',
        updatedAt: expect.anything(),
      });
    });
  });

  describe('DELETE /api/ai-agents/[id]', () => {
    const context = { params: Promise.resolve({ id: 'agent-1' }) };

    it('rejects member sessions', async () => {
      mocks.requireAdmin.mockResolvedValue(null);

      const response = await DELETE(
        new Request('http://localhost/api/ai-agents/agent-1', { method: 'DELETE' }),
        context,
      );

      expect(response.status).toBe(403);
      expect(remove).not.toHaveBeenCalled();
    });

    it('refuses to delete the built-in assistant', async () => {
      const response = await DELETE(
        new Request('http://localhost/api/ai-agents/default', { method: 'DELETE' }),
        { params: Promise.resolve({ id: 'default' }) },
      );

      expect(response.status).toBe(400);
      expect(remove).not.toHaveBeenCalled();
    });

    it('returns 404 when the agent does not exist', async () => {
      get.mockResolvedValue({ exists: false, data: () => undefined });

      const response = await DELETE(
        new Request('http://localhost/api/ai-agents/agent-1', { method: 'DELETE' }),
        context,
      );

      expect(response.status).toBe(404);
      expect(remove).not.toHaveBeenCalled();
    });

    it('deletes an agent for an admin session', async () => {
      const response = await DELETE(
        new Request('http://localhost/api/ai-agents/agent-1', { method: 'DELETE' }),
        context,
      );

      expect(response.status).toBe(200);
      expect(remove).toHaveBeenCalledOnce();
    });
  });
});
