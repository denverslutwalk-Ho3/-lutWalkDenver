'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';

type GalleryAsset = {
  id: string;
  title: string;
  description?: string;
  category?: 'photos' | 'flyers' | 'press' | 'zines' | 'general';
  imageUrl: string;
};

const ARCHIVE_CATEGORIES: Array<GalleryAsset['category']> = ['photos', 'flyers', 'press', 'zines', 'general'];

const COLLECTION: Array<{ src: string; alt: string; caption: string; category: string }> = [
  { src: '/media/slutwalk-2021-1.jpg', alt: 'SlutWalk Denver 2021 gathering, page one', caption: 'SlutWalk Denver, 2021', category: 'photo' },
  { src: '/media/slutwalk-2021-2.jpg', alt: 'SlutWalk Denver 2021 gathering, page two', caption: 'SlutWalk Denver, 2021', category: 'photo' },
  { src: '/media/call-for-zines.jpg', alt: 'Call for zines flyer', caption: 'Call for zines', category: 'flyer' },
  { src: '/media/how-to-submit.jpg', alt: 'How to submit a zine flyer', caption: 'How to submit', category: 'flyer' },
  { src: '/media/who-wants-to-submit.jpg', alt: 'Who wants to submit flyer', caption: 'Who wants to submit?', category: 'flyer' },
  { src: '/media/never-again-poster.jpg', alt: 'Never Again poster artwork', caption: 'Never Again', category: 'poster' },
  { src: '/media/pocket-zine.png', alt: 'Pocket zine cover', caption: 'Pocket zine', category: 'zine' },
];

export default function ArchivePage() {
  const [assets, setAssets] = useState<GalleryAsset[]>([]);
  const [loadError, setLoadError] = useState('');

  const loadAssets = useCallback(async () => {
    setLoadError('');
    try {
      const response = await fetch('/api/gallery?collection=archive&limit=120', { credentials: 'include' });
      if (!response.ok) {
        setLoadError('Uploaded archive items could not be loaded right now.');
        return;
      }
      const data = await response.json() as { assets?: GalleryAsset[] };
      if (Array.isArray(data.assets)) {
        setAssets(data.assets.filter((asset) => typeof asset.imageUrl === 'string' && asset.imageUrl.length > 0));
      }
    } catch {
      setLoadError('Uploaded archive items could not be loaded. Check your connection.');
    }
  }, []);

  useEffect(() => { void loadAssets(); }, [loadAssets]);

  const groupedAssets = useMemo(() => {
    const map = new Map<string, GalleryAsset[]>();
    for (const category of ARCHIVE_CATEGORIES) {
      map.set(category ?? 'general', []);
    }
    for (const asset of assets) {
      const key = asset.category ?? 'general';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(asset);
    }
    return map;
  }, [assets]);

  return (
    <main className="shell">
      <section className="hero" aria-labelledby="archive-title">
        <div className="hero-overlay">
          <p className="eyebrow">Archive</p>
          <h1 id="archive-title">History in motion.</h1>
          <p>
            Posters, photographs, and zines that trace the growth of SlutWalk Denver
            over time.
          </p>
        </div>
      </section>

      <section className="featured" aria-labelledby="collection-title">
        <h2 id="collection-title">From the collection</h2>
        <div className="media-grid">
          {COLLECTION.map((item) => (
            <figure className="media-card" key={item.src}>
              <Image
                src={item.src}
                alt={item.alt}
                width={600}
                height={800}
                className="media-image"
                unoptimized
              />
              <figcaption>
                <span className="eyebrow">{item.category}</span>
                {item.caption}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="featured" aria-labelledby="uploaded-title">
        <h2 id="uploaded-title">Uploaded archive items</h2>
        {loadError && <p className="notice notice--error" role="alert">{loadError}</p>}

        {ARCHIVE_CATEGORIES.map((category) => {
          const categoryName = category ?? 'general';
          const categoryAssets = groupedAssets.get(categoryName) ?? [];
          return (
            <div key={categoryName}>
              <h3>{categoryName.charAt(0).toUpperCase() + categoryName.slice(1)}</h3>
              {categoryAssets.length === 0 ? (
                <p className="helper">No uploaded items in this collection yet.</p>
              ) : (
                <div className="shop-grid" role="list">
                  {categoryAssets.map((asset) => (
                    <article key={asset.id} className="product-card" role="listitem">
                      <Image
                        src={asset.imageUrl}
                        alt={asset.title}
                        width={600}
                        height={400}
                        className="product-img"
                        unoptimized
                      />
                      <div className="product-info">
                        <h3>{asset.title}</h3>
                        {asset.description ? <p>{asset.description}</p> : null}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </main>
  );
}
