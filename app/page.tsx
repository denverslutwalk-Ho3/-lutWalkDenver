import Link from 'next/link';

const SECTIONS = [
  {
    href: '/organizing',
    title: 'Organizing',
    copy: 'Announcements, volunteer coordination, and mutual aid.',
  },
  {
    href: '/education',
    title: 'Education',
    copy: 'Zines, archive material, and shared history.',
  },
  {
    href: '/care',
    title: 'Care',
    copy: 'Support networks and ways to ask for or offer help.',
  },
  {
    href: '/calendar',
    title: 'Calendar',
    copy: 'Meetings, workshops, rallies, and volunteer shifts.',
  },
];

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero" aria-labelledby="page-title">
        <div className="hero-overlay">
          <p className="eyebrow">Community hub</p>
          <h1 id="page-title">$lutWalk Denver is a living collective.</h1>
          <p>
            A survivor-led space for organizing, education, care, and mutual aid in
            Denver. Member pages are private. Public pages are open to everyone.
          </p>
          <div className="btn-row">
            <Link className="btn" href="/login">Member sign in</Link>
            <Link className="btn btn-secondary" href="/about">About the collective</Link>
          </div>
        </div>
      </section>

      <section className="featured" aria-labelledby="sections-title">
        <h2 id="sections-title">What you will find here</h2>
        <div className="dashboard-grid">
          {SECTIONS.map((section) => (
            <Link className="dashboard-card" href={section.href} key={section.href}>
              <h3>{section.title}</h3>
              <p>{section.copy}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="featured" aria-labelledby="access-title">
        <h2 id="access-title">How member access works</h2>
        <p>
          There is one shared member password. Ask an organizer for it, then sign in
          once and your browser stays signed in for 30 days. Organizers sign in
          separately to manage events, posts, and the archive.
        </p>
        <div className="btn-row">
          <Link className="btn btn-secondary" href="/donate">Support the work</Link>
          <Link className="btn btn-secondary" href="/shop">Visit the store</Link>
        </div>
      </section>
    </main>
  );
}
