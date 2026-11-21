import Link from 'next/link';
import { DONATE_URL, CONTACT_EMAIL } from '../../lib/site';

export default function DonatePage() {
  return (
    <main className="shell">
      <section className="hero" aria-labelledby="donate-title">
        <div className="hero-overlay">
          <p className="eyebrow">Support and care</p>
          <h1 id="donate-title">Support practical care for people and communities.</h1>
          <p>
            Donations go to Rouge Support Network, our non-profit partner, and support
            survivor care and SlutWalk Denver organizing.
          </p>
          <div className="btn-row">
            <a href={DONATE_URL} target="_blank" rel="noopener noreferrer" className="btn">
              Donate to Rouge Support Network
            </a>
            <Link className="btn btn-secondary" href="/shop">See the store</Link>
          </div>
        </div>
      </section>

      <section className="featured" aria-labelledby="resources-title">
        <h2 id="resources-title">Other ways to help</h2>
        <ul className="plain-list">
          <li>
            <Link href="/care">Volunteer with the collective</Link>
          </li>
          <li>
            <Link href="/bulletin">Offer supplies or mutual aid on the bulletin</Link>
          </li>
          <li>
            <Link href="/shop">Submit or request a zine</Link>
          </li>
          <li>
            Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> to ask where
            help is needed most.
          </li>
        </ul>
      </section>
    </main>
  );
}
