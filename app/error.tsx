'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="shell">
      <section className="hero" aria-labelledby="error-title">
        <div className="hero-overlay">
          <p className="eyebrow">Error</p>
          <h1 id="error-title">Something went wrong.</h1>
          <p>This page could not load. Try again, or go back to the home page.</p>
          <div className="btn-row">
            <button className="btn" type="button" onClick={() => reset()}>
              Try again
            </button>
            <Link className="btn btn-secondary" href="/">Return home</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
