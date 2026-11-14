import Link from 'next/link';

const TIMELINE = [
  { year: '2011', text: 'First Denver SlutWalk, a march against victim-blaming and for bodily autonomy.' },
  { year: '2015', text: 'Workshops on consent, sex worker rights, and intersectional feminism.' },
  { year: '2020', text: 'Digital organizing and virtual community building.' },
  { year: '2022', text: 'Archive project launch to preserve flyers, photos, and zines.' },
];

export default function EducationPage() {
  return (
    <main className="shell">
      <section className="hero" aria-labelledby="education-title">
        <div className="hero-overlay">
          <p className="eyebrow">Education and resources</p>
          <h1 id="education-title">Learn, share, and preserve.</h1>
          <p>
            Zines, archive material, and the shared history of the collective.
          </p>
        </div>
      </section>

      <section className="featured" aria-labelledby="education-areas-title">
        <h2 id="education-areas-title">Start here</h2>
        <div className="cards">
          <article className="card">
            <h3>Zines</h3>
            <p>Self-published work with stories, art, and analysis from the community.</p>
            <Link className="btn btn-secondary" href="/zines">Browse zines</Link>
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

      <section className="featured" aria-labelledby="history-title">
        <h2 id="history-title">Shared history</h2>
        <div className="timeline" role="list">
          {TIMELINE.map((item) => (
            <article role="listitem" key={item.year}>
              <h3>{item.year}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
