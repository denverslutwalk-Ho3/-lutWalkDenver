import { beforeEach, describe, expect, it, vi } from 'vitest';

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
vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
}));

import { POST } from '../../app/api/events/[id]/rsvp/route';

describe('POST /api/events/[id]/rsvp', () => {
  const transaction = {
    get: vi.fn(),
    update: vi.fn(),
  };
  const eventRef = { id: 'event-1' };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireMemberOrAdmin.mockResolvedValue({ role: 'member', claims: { sub: 'member' } });
    transaction.get.mockResolvedValue({
      exists: true,
      get: () => [{ attendee: 'member', status: 'attending', at: 'old-time' }],
    });
    transaction.update.mockReset();
    mocks.getAdminDb.mockReturnValue({
      collection: () => ({ doc: () => eventRef }),
      runTransaction: (callback: (tx: typeof transaction) => unknown) => callback(transaction),
    });
  });

  it('stores one role-keyed RSVP while converting legacy array entries', async () => {
    const response = await POST(
      new Request('http://localhost/api/events/event-1/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'attending' }),
      }),
      { params: Promise.resolve({ id: 'event-1' }) },
    );

    expect(response.status).toBe(200);
    expect(transaction.update).toHaveBeenCalledWith(eventRef, {
      rsvps: {
        member: { status: 'attending', updatedAt: 'SERVER_TIMESTAMP' },
      },
    });
  });

  it('rejects unsupported statuses without running a transaction', async () => {
    const response = await POST(
      new Request('http://localhost/api/events/event-1/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'maybe' }),
      }),
      { params: Promise.resolve({ id: 'event-1' }) },
    );

    expect(response.status).toBe(400);
    expect(mocks.getAdminDb).not.toHaveBeenCalled();
  });
});
