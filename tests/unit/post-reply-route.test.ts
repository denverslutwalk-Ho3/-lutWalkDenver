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
  FieldValue: {
    serverTimestamp: () => 'SERVER_TIMESTAMP',
    increment: (value: number) => ({ increment: value }),
  },
}));

import { POST } from '../../app/api/posts/[id]/replies/route';

describe('POST /api/posts/[id]/replies', () => {
  const replyRef = { id: 'reply-1' };
  const transaction = {
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireMemberOrAdmin.mockResolvedValue({ role: 'member' });
    transaction.get.mockResolvedValue({ exists: true });
    transaction.create.mockReset();
    transaction.update.mockReset();
    mocks.getAdminDb.mockReturnValue({
      collection: () => ({
        doc: () => ({
          id: 'post-1',
          collection: () => ({ doc: () => replyRef }),
        }),
      }),
      runTransaction: (callback: (tx: typeof transaction) => unknown) => callback(transaction),
    });
  });

  it('creates the reply and increments the parent in one transaction', async () => {
    const response = await POST(
      new Request('http://localhost/api/posts/post-1/replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'A reply', sender: 'Impersonated admin' }),
      }),
      { params: Promise.resolve({ id: 'post-1' }) },
    );

    expect(response.status).toBe(201);
    expect(transaction.create).toHaveBeenCalledWith(replyRef, {
      text: 'A reply',
      sender: 'Member',
      createdAt: 'SERVER_TIMESTAMP',
    });
    expect(transaction.update).toHaveBeenCalledWith(
      transaction.get.mock.calls[0]?.[0],
      { replyCount: { increment: 1 } },
    );
  });

  it('does not create an orphan reply when the parent is missing', async () => {
    transaction.get.mockResolvedValue({ exists: false });
    const response = await POST(
      new Request('http://localhost/api/posts/post-1/replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'A reply' }),
      }),
      { params: Promise.resolve({ id: 'post-1' }) },
    );

    expect(response.status).toBe(404);
    expect(transaction.create).not.toHaveBeenCalled();
    expect(transaction.update).not.toHaveBeenCalled();
  });
});
