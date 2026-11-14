import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getAdminDb: vi.fn(),
  deleteStorageObject: vi.fn(),
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

import { DELETE, PATCH } from '../../app/api/products/[id]/route';

describe('/api/products/[id] image cleanup', () => {
  const productRef = {
    get: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue(true);
    productRef.get.mockResolvedValue({ data: () => ({ storagePath: 'products/old.png' }) });
    mocks.getAdminDb.mockReturnValue({
      collection: () => ({ doc: () => productRef }),
    });
  });

  it('deletes the previous product image after replacing it', async () => {
    const response = await PATCH(
      new Request('http://localhost/api/products/product-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: '/api/storage?path=products%2Fnew.png',
          storagePath: 'products/new.png',
        }),
      }),
      { params: Promise.resolve({ id: 'product-1' }) },
    );

    expect(response.status).toBe(200);
    expect(productRef.update).toHaveBeenCalledWith({
      imageUrl: '/api/storage?path=products%2Fnew.png',
      storagePath: 'products/new.png',
    });
    expect(mocks.deleteStorageObject).toHaveBeenCalledWith('products/old.png');
  });

  it('deletes the product image when deleting the product', async () => {
    const response = await DELETE(
      new Request('http://localhost/api/products/product-1', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'product-1' }) },
    );

    expect(response.status).toBe(200);
    expect(productRef.delete).toHaveBeenCalledOnce();
    expect(mocks.deleteStorageObject).toHaveBeenCalledWith('products/old.png');
  });
});
