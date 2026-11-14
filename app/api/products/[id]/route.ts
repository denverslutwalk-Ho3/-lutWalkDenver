import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../lib/firebase-admin';
import { requireAdmin } from '../../../../lib/authz';
import { deleteStorageObject } from '../../../../lib/storage-cleanup';
import { getProductStoragePath, isProductStoragePath } from '../../../../lib/product-storage';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  try {
    const db = getAdminDb();
    const productRef = db.collection('products').doc(id);
    const product = await productRef.get();
    const storagePath = getProductStoragePath(product.data());
    try {
      if (isProductStoragePath(storagePath)) await deleteStorageObject(storagePath);
    } catch (err) {
      console.error('DELETE /api/products/[id] image cleanup error:', err);
      return NextResponse.json(
        { error: 'Product image could not be cleaned up; product was not deleted' },
        { status: 500 },
      );
    }
    await productRef.delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/products/[id] error:', err);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  try {
    const body = await request.json() as Record<string, unknown>;
    const stringFields = ['name', 'description', 'imageUrl', 'category'];
    const numberFields = ['price', 'stock'];
    const updates: Record<string, unknown> = {};
    for (const key of stringFields) {
      if (typeof body[key] === 'string') updates[key] = (body[key] as string).trim();
    }
    for (const key of numberFields) {
      if (typeof body[key] === 'number' && !Number.isNaN(body[key])) {
        updates[key] = body[key];
      }
    }
    const requestedStoragePath = typeof body.storagePath === 'string' ? body.storagePath.trim() : undefined;
    const requestedImageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : undefined;
    if (requestedStoragePath !== undefined) {
      if (
        !isProductStoragePath(requestedStoragePath)
        || requestedImageUrl !== `/api/storage?path=${encodeURIComponent(requestedStoragePath)}`
      ) {
        return NextResponse.json({ error: 'Invalid product image path' }, { status: 400 });
      }
    }
    const newStoragePath = requestedStoragePath
      ?? (requestedImageUrl !== undefined
        ? getProductStoragePath({ imageUrl: requestedImageUrl }) ?? ''
        : undefined);
    if (newStoragePath !== undefined) updates.storagePath = newStoragePath;
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }
    const db = getAdminDb();
    const productRef = db.collection('products').doc(id);
    const product = await productRef.get();
    const oldStoragePath = getProductStoragePath(product.data());
    const imageChanged = newStoragePath !== undefined && newStoragePath !== oldStoragePath;
    if (imageChanged && isProductStoragePath(oldStoragePath)) {
      try {
        await deleteStorageObject(oldStoragePath);
      } catch (err) {
        console.error('PATCH /api/products/[id] image cleanup error:', err);
        return NextResponse.json(
          { error: 'Previous product image could not be cleaned up; product was not updated' },
          { status: 500 },
        );
      }
    }
    try {
      await productRef.update(updates);
    } catch (err) {
      if (imageChanged && isProductStoragePath(oldStoragePath)) {
        console.error('PATCH /api/products/[id] metadata update error after image cleanup:', err);
        return NextResponse.json(
          { error: 'Previous product image was removed, but product metadata could not be updated' },
          { status: 500 },
        );
      }
      throw err;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/products/[id] error:', err);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}
