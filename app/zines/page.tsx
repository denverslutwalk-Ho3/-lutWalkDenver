import Link from 'next/link';
import { DONATE_URL } from '../../lib/site';

export default function ZinesPage() {
  return (
    <main className="shell">
      <section className="hero" aria-labelledby="zines-title">
        <div className="hero-overlay">
          <p className="eyebrow">Zines</p>
          <h1 id="zines-title">Print, story, and resistance.</h1>
          <p>
            Zines that bring together art, survivor testimony, and shared strategies
            for care and action.
          </p>
          <div className="btn-row">
            <a href={DONATE_URL} target="_blank" rel="noopener noreferrer" className="btn">
              Donate to access zine PDFs
            </a>
            <Link className="btn btn-secondary" href="/archive">Browse the archive</Link>
          </div>
        </div>
      </section>

      <section className="featured" aria-labelledby="zines-how-title">
        <h2 id="zines-how-title">How to get the PDFs</h2>
        <p>
          Zine PDFs are released to supporters who donate to{' '}
          <a href={DONATE_URL} target="_blank" rel="noopener noreferrer">Rouge Support Network</a>,
          our non-profit partner. Every contribution supports survivor care.
        </p>
        <p>
          Printed copies and zine submissions are coordinated by organizers. Email{' '}
          <a href="mailto:denverslutwalk@proton.me">denverslutwalk@proton.me</a> to ask
          about submitting work or getting a print copy.
        </p>
      </section>
    </main>
  );
}
