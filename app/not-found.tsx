import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="shell">
      <section className="hero" aria-labelledby="not-found-title">
        <div className="hero-overlay">
          <p className="eyebrow">Error</p>
          <h1 id="not-found-title">Page not found.</h1>
          <p>The page you asked for does not exist or has moved.</p>
          <div className="btn-row">
            <Link className="btn" href="/">Return home</Link>
            <Link className="btn btn-secondary" href="/community">Go to the community hub</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
