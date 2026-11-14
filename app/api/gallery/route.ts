import { NextResponse } from 'next/server';
import { FieldValue, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getAdminDb } from '../../../lib/firebase-admin';
import { requireAdmin, requireMemberOrAdmin } from '../../../lib/authz';
import { collectMatchingItems } from '../../../lib/gallery-pagination';

type GalleryCollection = 'archive' | 'community';
type GalleryCategory = 'photos' | 'flyers' | 'press' | 'zines' | 'general';
const GALLERY_PAGE_SIZE = 200;
const GALLERY_COLLECTIONS: GalleryCollection[] = ['archive', 'community'];
const GALLERY_CATEGORIES: GalleryCategory[] = ['photos', 'flyers', 'press', 'zines', 'general'];
type GalleryAssetRecord = {
  id: string;
  title?: string;
  description?: string;
  collection?: string;
  category?: string;
  imageUrl?: string;
  storagePath?: string;
  contentType?: string;
  createdAt?: unknown;
};

export async function GET(request: Request) {
  if (!(await requireMemberOrAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const collectionFilter = searchParams.get('collection');
  const categoryFilter = searchParams.get('category');
  const limitParam = Number(searchParams.get('limit') ?? '100');
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(1, limitParam), 200) : 100;
  if (
    (collectionFilter && !GALLERY_COLLECTIONS.includes(collectionFilter as GalleryCollection))
    || (categoryFilter && !GALLERY_CATEGORIES.includes(categoryFilter as GalleryCategory))
  ) {
    return NextResponse.json({ assets: [] });
  }

  try {
    const db = getAdminDb();
    const collectionRef = db.collection('galleryAssets');
    const assets = await collectMatchingItems(
      async (cursor) => {
        let query = collectionRef.orderBy('createdAt', 'desc').limit(GALLERY_PAGE_SIZE);
        if (cursor) query = query.startAfter(cursor);
        const page = await query.get();
        return {
          items: page.docs.map((doc: QueryDocumentSnapshot) => ({
            id: doc.id,
            ...doc.data(),
          }) as GalleryAssetRecord),
          nextCursor: page.docs.at(-1),
          hasMore: page.docs.length === GALLERY_PAGE_SIZE,
        };
      },
      (asset) => {
        if (collectionFilter && asset.collection !== collectionFilter) return false;
        if (categoryFilter && asset.category !== categoryFilter) return false;
        return true;
      },
      limit,
    );

    const responseAssets = assets.map((asset) => asset.storagePath
        ? {
            ...asset,
            imageUrl: `/api/storage?path=${encodeURIComponent(asset.storagePath)}`,
          }
        : asset);

    return NextResponse.json({ assets: responseAssets });
  } catch (err) {
    console.error('GET /api/gallery error:', err);
    return NextResponse.json({ error: 'Failed to load gallery assets' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 });
  }

  try {
    const body = await request.json() as {
      title?: unknown;
      description?: unknown;
      collection?: unknown;
      category?: unknown;
      imageUrl?: unknown;
      storagePath?: unknown;
      contentType?: unknown;
    };

    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const collection = typeof body.collection === 'string' ? body.collection.trim() : '';
    const category = typeof body.category === 'string' ? body.category.trim() : 'general';
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
    const storagePath = typeof body.storagePath === 'string' ? body.storagePath.trim() : '';
    const contentType = typeof body.contentType === 'string' ? body.contentType.trim() : '';

    const validCollections: GalleryCollection[] = ['archive', 'community'];
    const validCategories: GalleryCategory[] = ['photos', 'flyers', 'press', 'zines', 'general'];

    if (!title || !imageUrl || !validCollections.includes(collection as GalleryCollection)) {
      return NextResponse.json(
        { error: 'title, imageUrl, and a valid collection are required' },
        { status: 400 },
      );
    }

    if (!validCategories.includes(category as GalleryCategory)) {
      return NextResponse.json({ error: 'invalid category' }, { status: 400 });
    }

    const db = getAdminDb();
    const ref = await db.collection('galleryAssets').add({
      title,
      description,
      collection,
      category,
      imageUrl,
      storagePath,
      contentType,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ id: ref.id }, { status: 201 });
  } catch (err) {
    console.error('POST /api/gallery error:', err);
    return NextResponse.json({ error: 'Failed to create gallery asset' }, { status: 500 });
  }
}
