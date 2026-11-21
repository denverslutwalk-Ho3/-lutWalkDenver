import Link from 'next/link';

export default function CarePage() {
  return (
    <main className="shell">
      <section className="hero" aria-labelledby="care-title">
        <div className="hero-overlay">
          <p className="eyebrow">Community care</p>
          <h1 id="care-title">Organize, learn, and care.</h1>
          <p>
            Ways to get involved, learn together, preserve our history, and ask for
            or offer support.
          </p>
        </div>
      </section>

      <section className="featured" aria-labelledby="organizing-title">
        <h2 id="organizing-title">Get involved</h2>
        <div className="cards">
          <article className="card">
            <h3>Announcements and requests</h3>
            <p>Read updates, post a need, or offer support to another member.</p>
            <Link className="btn btn-secondary" href="/bulletin">Open the bulletin</Link>
          </article>
          <article className="card">
            <h3>Events and volunteer shifts</h3>
            <p>See what is coming up and RSVP so organizers can plan.</p>
            <Link className="btn btn-secondary" href="/calendar">Open the calendar</Link>
          </article>
          <article className="card">
            <h3>Coordinate in real time</h3>
            <p>Use member chat for logistics, safety, and planning.</p>
            <Link className="btn btn-secondary" href="/chat">Open member chat</Link>
          </article>
        </div>
      </section>

      <section className="featured" aria-labelledby="education-title">
        <h2 id="education-title">Learn and preserve</h2>
        <div className="cards">
          <article className="card">
            <h3>Zines</h3>
            <p>Self-published work with stories, art, and analysis from the community.</p>
            <Link className="btn btn-secondary" href="/shop">Browse zines</Link>
          </article>
          <article className="card">
            <h3>Archive</h3>
            <p>Flyers, photographs, and posters from past actions and events.</p>
            <Link className="btn btn-secondary" href="/archive">Explore the archive</Link>
          </article>
          <article className="card">
            <h3>Gallery</h3>
            <p>Photos and materials shared by members.</p>
            <Link className="btn btn-secondary" href="/community">View the gallery</Link>
          </article>
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
              The member chat is a shared space for support and coordination. Messages
              are encrypted before storage, but the server and all signed-in members
              can derive the shared key, so it is not end-to-end encrypted.
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
          <li>Chat messages are encrypted before storage, but the shared key is available to the server and all signed-in members.</li>
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
