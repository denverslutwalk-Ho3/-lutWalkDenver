import { CONTACT_EMAIL } from '../../lib/site';

export default function AccessibilityPage() {
  return (
    <main className="shell">
      <section className="hero" aria-labelledby="accessibility-title">
        <div className="hero-overlay">
          <p className="eyebrow">Accessibility</p>
          <h1 id="accessibility-title">Accessibility Statement</h1>
          <p>Our commitment to inclusive access.</p>
        </div>
      </section>

      <section className="featured" aria-labelledby="commitment-title">
        <h2 id="commitment-title">Our commitment</h2>
        <p>
          We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.1 at level
          AA. This is ongoing work, not a finished claim.
        </p>

        <h2>What the site does</h2>
        <ul className="plain-list">
          <li>Every page works with a keyboard alone.</li>
          <li>A skip link moves focus to the main content.</li>
          <li>Headings, landmarks, labels, and form errors are announced to screen readers.</li>
          <li>Text and controls are checked for colour contrast.</li>
          <li>Layouts reflow on phones, tablets, and desktops without sideways scrolling.</li>
          <li>Animations are reduced when your device asks for reduced motion.</li>
        </ul>

        <h2>Known limitations</h2>
        <p>
          Some archived PDFs were not created with accessibility in mind and may not be
          tagged for screen readers. If you need an accessible version of a document,
          ask us and we will provide one.
        </p>

        <h2>Feedback</h2>
        <p>
          Tell us about a barrier at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We aim to reply within
          five working days.
        </p>
      </section>
    </main>
  );
}
