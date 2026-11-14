import { CONTACT_EMAIL } from '../../lib/site';

export default function TermsPage() {
  return (
    <main className="shell">
      <section className="hero" aria-labelledby="terms-title">
        <div className="hero-overlay">
          <p className="eyebrow">Legal</p>
          <h1 id="terms-title">Terms of Service</h1>
          <p>Ground rules for using this community hub.</p>
        </div>
      </section>

      <section className="featured" aria-labelledby="terms-details-title">
        <h2 id="terms-details-title">Using this site</h2>
        <p>
          Member pages are for people who have been given the shared member password by
          an organizer. Do not share that password publicly, and do not post someone
          else&apos;s private information without their consent.
        </p>

        <h2>Community conduct</h2>
        <ul className="plain-list">
          <li>No harassment, threats, or targeted abuse.</li>
          <li>No sharing another person&apos;s story, image, or location without consent.</li>
          <li>No spam, advertising, or content that breaks the law.</li>
          <li>Organizers may remove posts or accounts that break these rules.</li>
        </ul>

        <h2>Content you post</h2>
        <p>
          You keep ownership of what you post. By posting, you allow the collective to
          display and store it as part of the site. Organizers may remove content to keep
          the space safe.
        </p>

        <h2>No warranty</h2>
        <p>
          This site is run by volunteers and is provided as-is. It is not a crisis or
          medical service. In an emergency, contact local emergency services.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these terms: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
    </main>
  );
}
