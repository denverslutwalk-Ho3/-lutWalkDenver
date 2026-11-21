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
vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    increment: (value: number) => ({ increment: value }),
  },
}));

import { DELETE } from '../../app/api/posts/[id]/replies/[replyId]/route';

describe('DELETE /api/posts/[id]/replies/[replyId]', () => {
  const transaction = {
    get: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ role: 'admin' });
    transaction.get.mockResolvedValue({ exists: true });
    transaction.delete.mockReset();
    transaction.update.mockReset();
    mocks.getAdminDb.mockReturnValue({
      collection: () => ({
        doc: () => ({
          collection: () => ({
            doc: () => ({ id: 'reply-1' }),
          }),
        }),
      }),
      runTransaction: (callback: (tx: typeof transaction) => unknown) => callback(transaction),
    });
  });

  it('requires an admin and removes the reply atomically', async () => {
    const response = await DELETE(
      new Request('http://localhost/api/posts/post-1/replies/reply-1', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'post-1', replyId: 'reply-1' }) },
    );

    expect(response.status).toBe(200);
    expect(transaction.delete).toHaveBeenCalledOnce();
    expect(transaction.update).toHaveBeenCalledWith(
      expect.anything(),
      { replyCount: { increment: -1 } },
    );
  });

  it('rejects member sessions', async () => {
    mocks.requireAdmin.mockResolvedValue(null);
    const response = await DELETE(
      new Request('http://localhost/api/posts/post-1/replies/reply-1', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'post-1', replyId: 'reply-1' }) },
    );
    expect(response.status).toBe(403);
  });
});
