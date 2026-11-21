import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getAdminDb: vi.fn(),
  deleteStorageObject: vi.fn(),
  isPostStoragePath: vi.fn(),
}));

vi.mock('../../lib/authz', () => ({
  requireAdmin: mocks.requireAdmin,
}));
vi.mock('../../lib/firebase-admin', () => ({
  getAdminDb: mocks.getAdminDb,
}));
vi.mock('../../lib/storage-cleanup', () => ({
  deleteStorageObject: mocks.deleteStorageObject,
}));
vi.mock('../../lib/post-storage', () => ({
  isPostStoragePath: mocks.isPostStoragePath,
}));

import { DELETE } from '../../app/api/posts/[id]/route';

describe('DELETE /api/posts/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isPostStoragePath.mockReturnValue(false);
  });

  it('rejects member sessions', async () => {
    mocks.requireAdmin.mockResolvedValue(null);

    const response = await DELETE(
      new Request('http://localhost/api/posts/post-1', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'post-1' }) },
    );

    expect(response.status).toBe(403);
    expect(mocks.getAdminDb).not.toHaveBeenCalled();
  });

  it('allows admin deletion and removes replies first', async () => {
    mocks.requireAdmin.mockResolvedValue({ role: 'admin', claims: {} });
    const deleteReply = vi.fn().mockResolvedValue(undefined);
    const deletePost = vi.fn().mockResolvedValue(undefined);
    mocks.getAdminDb.mockReturnValue({
      collection: () => ({
        doc: () => ({
          get: vi.fn().mockResolvedValue({ data: () => ({ storagePath: null }) }),
          collection: () => ({
            listDocuments: vi.fn().mockResolvedValue([{ delete: deleteReply }]),
          }),
          delete: deletePost,
        }),
      }),
    });

    const response = await DELETE(
      new Request('http://localhost/api/posts/post-1', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'post-1' }) },
    );

    expect(response.status).toBe(200);
    expect(deleteReply).toHaveBeenCalledOnce();
    expect(deletePost).toHaveBeenCalledOnce();
  });
});
