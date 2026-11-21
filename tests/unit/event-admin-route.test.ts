import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getAdminDb: vi.fn(),
}));

vi.mock('../../lib/authz', () => ({
  requireAdmin: mocks.requireAdmin,
}));
vi.mock('../../lib/firebase-admin', () => ({
  getAdminDb: mocks.getAdminDb,
}));

import { DELETE, PATCH } from '../../app/api/events/[id]/route';

describe('event admin actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects member deletion', async () => {
    mocks.requireAdmin.mockResolvedValue(null);
    const response = await DELETE(
      new Request('http://localhost/api/events/event-1', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'event-1' }) },
    );
    expect(response.status).toBe(403);
    expect(mocks.getAdminDb).not.toHaveBeenCalled();
  });

  it('allows an admin to delete an event', async () => {
    mocks.requireAdmin.mockResolvedValue({ role: 'admin', claims: {} });
    const deleteEvent = vi.fn().mockResolvedValue(undefined);
    mocks.getAdminDb.mockReturnValue({
      collection: () => ({
        doc: () => ({ delete: deleteEvent }),
      }),
    });
    const response = await DELETE(
      new Request('http://localhost/api/events/event-1', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'event-1' }) },
    );
    expect(response.status).toBe(200);
    expect(deleteEvent).toHaveBeenCalledOnce();
  });

  it('allows an admin to archive and restore an event', async () => {
    mocks.requireAdmin.mockResolvedValue({ role: 'admin', claims: {} });
    const updateEvent = vi.fn().mockResolvedValue(undefined);
    mocks.getAdminDb.mockReturnValue({
      collection: () => ({
        doc: () => ({ update: updateEvent }),
      }),
    });
    const response = await PATCH(
      new Request('http://localhost/api/events/event-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
      }),
      { params: Promise.resolve({ id: 'event-1' }) },
    );
    expect(response.status).toBe(200);
    expect(updateEvent).toHaveBeenCalledWith({ archived: true });
  });

  it('rejects member archive attempts', async () => {
    mocks.requireAdmin.mockResolvedValue(null);
    const response = await PATCH(
      new Request('http://localhost/api/events/event-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
      }),
      { params: Promise.resolve({ id: 'event-1' }) },
    );
    expect(response.status).toBe(403);
    expect(mocks.getAdminDb).not.toHaveBeenCalled();
  });
});
