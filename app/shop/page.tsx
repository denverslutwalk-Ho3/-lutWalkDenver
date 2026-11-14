'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { DONATE_URL } from '../../lib/site';

type Product = {
  id: string;
  name: string;
  description: string;
  price: number; // cents
  imageUrl: string;
  category: string;
  stock: number;
};

const CATEGORIES = ['all', 'apparel', 'stickers', 'zines', 'posters', 'books', 'other'];

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await fetch('/api/products', { credentials: 'include' });
      if (!response.ok) {
        setLoadError('The store could not be loaded. Try again in a moment.');
        return;
      }
      const data = await response.json() as { products?: Product[] };
      setProducts(Array.isArray(data.products) ? data.products : []);
    } catch {
      setLoadError('The store could not be loaded. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadProducts(); }, [loadProducts]);

  const visible = products.filter((product) => category === 'all' || product.category === category);

  return (
    <main className="shell">
      <section className="hero" aria-labelledby="shop-title">
        <div className="hero-overlay">
          <p className="eyebrow">Community store</p>
          <h1 id="shop-title">Support the work through education and merch.</h1>
          <p>
            Zine PDFs are available when you donate to{' '}
            <a href={DONATE_URL} target="_blank" rel="noopener noreferrer" className="link--inline">
              Rouge Support Network
            </a>
            , our non-profit partner. Every contribution supports survivor care.
          </p>
          <div className="btn-row">
            <Link className="btn" href="/donate">Open donation page</Link>
          </div>
        </div>
      </section>

      <nav aria-label="Product categories" className="category-nav">
        {CATEGORIES.map((option) => (
          <button
            key={option}
            type="button"
            className={`category-btn ${category === option ? 'category-btn--active' : ''}`}
            onClick={() => setCategory(option)}
            aria-pressed={category === option}
          >
            {option}
          </button>
        ))}
      </nav>

      <section className="featured" aria-labelledby="products-title">
        <h2 id="products-title">Items</h2>
        {loading && <p>Loading items…</p>}
        {loadError && (
          <div className="notice notice--error" role="alert">
            <p>{loadError}</p>
            <button type="button" className="btn btn-secondary" onClick={() => void loadProducts()}>
              Try again
            </button>
          </div>
        )}

        {!loading && !loadError && visible.length === 0 && (
          <p>
            No items in this category yet. Organizers add items from the admin
            dashboard.
          </p>
        )}

        <div className="shop-grid" role="list">
          {visible.map((product) => (
            <article key={product.id} className="product-card" role="listitem">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  width={300}
                  height={300}
                  className="product-img"
                  unoptimized
                />
              ) : (
                <div className="product-img-placeholder" aria-hidden="true">
                  {product.category}
                </div>
              )}
              <div className="product-info">
                <p className="eyebrow">{product.category}</p>
                <h3>
                  <button
                    type="button"
                    className="product-title-btn"
                    onClick={() => setSelectedProduct(product)}
                  >
                    {product.name}
                  </button>
                </h3>
                <p className="price">${(product.price / 100).toFixed(2)}</p>
                {product.category === 'zines' ? (
                  <a href={DONATE_URL} target="_blank" rel="noopener noreferrer" className="btn">
                    Donate to download PDF
                  </a>
                ) : (
                  <p className="helper">Contact an organizer to order.</p>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {selectedProduct && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={selectedProduct.name}
          onClick={(event) => { if (event.target === event.currentTarget) setSelectedProduct(null); }}
        >
          <div className="modal-card">
            <button
              type="button"
              className="modal-close"
              onClick={() => setSelectedProduct(null)}
              aria-label="Close product details"
            >
              ×
            </button>
            {selectedProduct.imageUrl && (
              <Image
                src={selectedProduct.imageUrl}
                alt={selectedProduct.name}
                width={400}
                height={400}
                className="post-image"
                unoptimized
              />
            )}
            <p className="eyebrow">{selectedProduct.category}</p>
            <h2>{selectedProduct.name}</h2>
            <p>{selectedProduct.description}</p>
            {selectedProduct.category === 'zines' ? (
              <a
                href={DONATE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
              >
                Donate to Rouge Support Network to download the PDF
              </a>
            ) : (
              <p className="helper">Contact an organizer to order this item.</p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
