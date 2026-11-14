import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../lib/firebase-admin';
import { requireAdmin } from '../../../../lib/authz';
import { deleteStorageObject } from '../../../../lib/storage-cleanup';

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
    const doc = await db.collection('galleryAssets').doc(id).get();
    await deleteStorageObject(doc.data()?.storagePath);
    await db.collection('galleryAssets').doc(id).delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/gallery/[id] error:', err);
    return NextResponse.json({ error: 'Failed to delete gallery asset' }, { status: 500 });
  }
}
