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
    await productRef.delete();
    try {
      const storagePath = getProductStoragePath(product.data());
      if (isProductStoragePath(storagePath)) await deleteStorageObject(storagePath);
    } catch (err) {
      console.error('DELETE /api/products/[id] image cleanup error:', err);
      return NextResponse.json(
        { error: 'Product was deleted, but its image could not be cleaned up' },
        { status: 500 },
      );
    }
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
    const newStoragePath = typeof body.storagePath === 'string' ? body.storagePath.trim() : undefined;
    if (newStoragePath !== undefined) {
      if (newStoragePath && !isProductStoragePath(newStoragePath)) {
        return NextResponse.json({ error: 'Invalid product image path' }, { status: 400 });
      }
      updates.storagePath = newStoragePath;
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }
    const db = getAdminDb();
    const productRef = db.collection('products').doc(id);
    const product = await productRef.get();
    const oldStoragePath = getProductStoragePath(product.data());
    await productRef.update(updates);
    if (
      newStoragePath !== undefined
      && newStoragePath !== oldStoragePath
      && isProductStoragePath(oldStoragePath)
    ) {
      try {
        await deleteStorageObject(oldStoragePath);
      } catch (err) {
        console.error('PATCH /api/products/[id] image cleanup error:', err);
        return NextResponse.json(
          { error: 'Product was updated, but its previous image could not be cleaned up' },
          { status: 500 },
        );
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/products/[id] error:', err);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}
