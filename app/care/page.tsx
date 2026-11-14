import Link from 'next/link';

export default function CarePage() {
  return (
    <main className="shell">
      <section className="hero" aria-labelledby="care-title">
        <div className="hero-overlay">
          <p className="eyebrow">Care and support</p>
          <h1 id="care-title">Care</h1>
          <p>
            Ways to ask for help, offer help, and stay connected with people who share
            the work.
          </p>
        </div>
      </section>

      <section className="featured" aria-labelledby="care-areas-title">
        <h2 id="care-areas-title">Where to start</h2>
        <div className="cards">
          <article className="card">
            <h3>Ask for or offer mutual aid</h3>
            <p>
              Post a request or an offer on the bulletin: rides, food, supplies,
              childcare, or a listening ear.
            </p>
            <Link className="btn btn-secondary" href="/bulletin">Go to the bulletin</Link>
          </article>
          <article className="card">
            <h3>Talk with other members</h3>
            <p>
              The member chat is a private space for support and coordination. Messages
              are encrypted before they are stored.
            </p>
            <Link className="btn btn-secondary" href="/chat">Open member chat</Link>
          </article>
          <article className="card">
            <h3>Find events and workshops</h3>
            <p>
              The calendar lists meetings, workshops, and support gatherings posted by
              organizers.
            </p>
            <Link className="btn btn-secondary" href="/calendar">Open the calendar</Link>
          </article>
        </div>
      </section>

      <section className="featured" aria-labelledby="privacy-title">
        <h2 id="privacy-title">Privacy and confidentiality</h2>
        <ul className="plain-list">
          <li>Member pages are only visible after sign-in.</li>
          <li>Chat messages are encrypted before they are stored.</li>
          <li>Share someone else&apos;s story only with their consent.</li>
          <li>Use the bulletin to ask for help without sharing more than you want to.</li>
        </ul>
        <p>
          In an emergency, contact local emergency services. This site is not a crisis
          service and cannot respond in real time.
        </p>
      </section>
    </main>
  );
}
