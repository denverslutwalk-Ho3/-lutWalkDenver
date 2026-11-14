'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

type GalleryAsset = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  imageUrl: string;
};

export default function CommunityPage() {
  const [assets, setAssets] = useState<GalleryAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const loadAssets = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await fetch('/api/gallery?collection=community&limit=60', { credentials: 'include' });
      if (!response.ok) {
        setLoadError('The gallery could not be loaded. Try again in a moment.');
        return;
      }
      const data = await response.json() as { assets?: GalleryAsset[] };
      setAssets(
        Array.isArray(data.assets)
          ? data.assets.filter((asset) => typeof asset.imageUrl === 'string' && asset.imageUrl.length > 0)
          : [],
      );
    } catch {
      setLoadError('The gallery could not be loaded. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAssets(); }, [loadAssets]);

  return (
    <main className="shell">
      <section className="hero" aria-labelledby="community-title">
        <div className="hero-overlay">
          <p className="eyebrow">Community</p>
          <h1 id="community-title">Member space and collective care.</h1>
          <p>
            Share updates on the bulletin, coordinate on the calendar, and stay in
            conversation with the wider organizing circle.
          </p>
          <div className="btn-row">
            <Link className="btn" href="/bulletin">Open the bulletin</Link>
            <Link className="btn btn-secondary" href="/chat">Open member chat</Link>
          </div>
        </div>
      </section>

      <section className="featured" aria-labelledby="gallery-title">
        <h2 id="gallery-title">Shared gallery</h2>
        {loading && <p>Loading gallery…</p>}
        {loadError && (
          <div className="notice notice--error" role="alert">
            <p>{loadError}</p>
            <button type="button" className="btn btn-secondary" onClick={() => void loadAssets()}>
              Try again
            </button>
          </div>
        )}
        {!loading && !loadError && assets.length === 0 && (
          <p>
            No shared photos yet. Organizers can upload them from the admin archive
            tab.
          </p>
        )}

        {assets.length > 0 && (
          <div className="shop-grid" role="list">
            {assets.map((asset) => (
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
                  <p className="eyebrow">{asset.category ?? 'general'}</p>
                  <h3>{asset.title}</h3>
                  {asset.description ? <p>{asset.description}</p> : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
