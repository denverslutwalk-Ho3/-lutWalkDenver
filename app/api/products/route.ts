import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../lib/firebase-admin';
import { requireAdmin, requireMemberOrAdmin } from '../../../lib/authz';
import { FieldValue, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { deleteStorageObject } from '../../../lib/storage-cleanup';
import { isProductStoragePath } from '../../../lib/product-storage';

export async function GET() {
  if (!(await requireMemberOrAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const snap = await db.collection('products').orderBy('createdAt', 'desc').get();
    const products = snap.docs.map((doc: QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ products });
  } catch (err) {
    console.error('GET /api/products error:', err);
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 });
  }

  try {
    const body = await request.json() as {
      name?: unknown;
      description?: unknown;
      price?: unknown;
      imageUrl?: unknown;
      storagePath?: unknown;
      category?: unknown;
      stock?: unknown;
    };

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const price = typeof body.price === 'number' ? body.price : 0;
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
    const storagePath = typeof body.storagePath === 'string' ? body.storagePath.trim() : '';
    const category = typeof body.category === 'string' ? body.category.trim() : 'other';
    const stock = typeof body.stock === 'number' ? body.stock : 0;

    if (!name || price < 0) {
      return NextResponse.json({ error: 'name and a non-negative price are required' }, { status: 400 });
    }
    if (
      storagePath
      && (
        !isProductStoragePath(storagePath)
        || imageUrl !== `/api/storage?path=${encodeURIComponent(storagePath)}`
      )
    ) {
      return NextResponse.json({ error: 'Invalid product image path' }, { status: 400 });
    }

    const db = getAdminDb();
    const ref = db.collection('products').doc();
    try {
      await ref.set({
        name,
        description,
        price,
        imageUrl,
        storagePath,
        category,
        stock,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      if (storagePath) {
        try {
          await deleteStorageObject(storagePath);
        } catch (cleanupError) {
          console.error('POST /api/products upload cleanup error:', cleanupError);
        }
      }
      throw err;
    }

    return NextResponse.json({ id: ref.id }, { status: 201 });
  } catch (err) {
    console.error('POST /api/products error:', err);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
