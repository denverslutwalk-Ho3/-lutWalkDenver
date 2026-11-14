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

  it('derives and persists a Storage path when an image URL is replaced directly', async () => {
    const response = await PATCH(
      new Request('http://localhost/api/products/product-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: '/api/storage?path=products%2Fnew.png' }),
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

  it('keeps the product record when Storage cleanup fails', async () => {
    mocks.deleteStorageObject.mockRejectedValueOnce(new Error('Storage unavailable'));
    const response = await DELETE(
      new Request('http://localhost/api/products/product-1', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'product-1' }) },
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: 'Product image could not be cleaned up; product was not deleted',
    });
    expect(productRef.delete).not.toHaveBeenCalled();
  });

  it('does not replace product metadata when old-image cleanup fails', async () => {
    mocks.deleteStorageObject.mockRejectedValueOnce(new Error('Storage unavailable'));
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

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: 'Previous product image could not be cleaned up; product was not updated',
    });
    expect(productRef.update).not.toHaveBeenCalled();
  });

  it('rejects a product path that does not match its private image URL', async () => {
    const response = await PATCH(
      new Request('http://localhost/api/products/product-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: 'https://example.com/image.png',
          storagePath: 'products/new.png',
        }),
      }),
      { params: Promise.resolve({ id: 'product-1' }) },
    );

    expect(response.status).toBe(400);
    expect(productRef.update).not.toHaveBeenCalled();
    expect(mocks.deleteStorageObject).not.toHaveBeenCalled();
  });
});
