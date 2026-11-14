import Link from 'next/link';

export default function OrganizingPage() {
  return (
    <main className="shell">
      <section className="hero" aria-labelledby="organizing-title">
        <div className="hero-overlay">
          <p className="eyebrow">Community organizing</p>
          <h1 id="organizing-title">Get involved in the collective.</h1>
          <p>
            Announcements, event planning, volunteer coordination, and mutual aid.
          </p>
        </div>
      </section>

      <section className="featured" aria-labelledby="organizing-areas-title">
        <h2 id="organizing-areas-title">Ways to plug in</h2>
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
            <p>Use the member chat for logistics, safety, and planning.</p>
            <Link className="btn btn-secondary" href="/chat">Open member chat</Link>
          </article>
          <article className="card">
            <h3>Preserve the work</h3>
            <p>Look back at flyers, photos, and past calls to action.</p>
            <Link className="btn btn-secondary" href="/archive">Open the archive</Link>
          </article>
        </div>
      </section>

      <section className="featured" aria-labelledby="help-title">
        <h2 id="help-title">Need something that is not here?</h2>
        <p>
          Post on the bulletin or email <a href="mailto:denverslutwalk@proton.me">denverslutwalk@proton.me</a> and
          an organizer will follow up.
        </p>
      </section>
    </main>
  );
}
