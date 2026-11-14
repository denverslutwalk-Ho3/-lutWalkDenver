import Link from 'next/link';

export default function AboutPage() {
  return (
    <main className="shell">
      <section className="hero" aria-labelledby="about-title">
        <div className="hero-overlay">
          <p className="eyebrow">About</p>
          <h1 id="about-title">Roots, purpose, and future direction.</h1>
          <p>
            SlutWalk Denver is a survivor-led collective organizing around safety,
            visibility, solidarity, and public accountability.
          </p>
        </div>
      </section>

      <section className="featured" aria-labelledby="mission-title">
        <h2 id="mission-title">What this movement stands for</h2>
        <p>
          We build community through care, direct action, education, and media that
          reflects lived experience rather than shame or blame.
        </p>
        <ul className="plain-list">
          <li>Bodily autonomy and consent, without exception.</li>
          <li>Safety and dignity for sex workers and survivors.</li>
          <li>Mutual aid and shared resources over charity.</li>
          <li>Public accountability for people and institutions that cause harm.</li>
        </ul>
      </section>

      <section className="featured" aria-labelledby="join-title">
        <h2 id="join-title">Get involved</h2>
        <p>
          Member pages are private. Ask an organizer for the shared member password,
          then sign in to post on the bulletin, join the chat, and see the calendar.
        </p>
        <div className="btn-row btn-row--start">
          <Link className="btn" href="/login">Member sign in</Link>
          <Link className="btn btn-secondary" href="/organizing">See ways to help</Link>
          <Link className="btn btn-secondary" href="/donate">Support the work</Link>
        </div>
      </section>
    </main>
  );
}
