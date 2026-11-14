import { CONTACT_EMAIL } from '../../lib/site';

export default function PrivacyPage() {
  return (
    <main className="shell">
      <section className="hero" aria-labelledby="privacy-title">
        <div className="hero-overlay">
          <p className="eyebrow">Legal</p>
          <h1 id="privacy-title">Privacy Policy</h1>
          <p>What this site stores, and what it does not.</p>
        </div>
      </section>

      <section className="featured" aria-labelledby="privacy-details-title">
        <h2 id="privacy-details-title">What we collect</h2>
        <ul className="plain-list">
          <li>
            <strong>Session cookie.</strong> After sign-in we set a signed, http-only
            cookie so protected pages load. It lasts 30 days for members and 8 hours
            for administrators.
          </li>
          <li>
            <strong>Content you post.</strong> Bulletin posts, replies, chat messages,
            and uploaded images are stored in our Firebase project so other members can
            see them.
          </li>
          <li>
            <strong>AI assistant messages.</strong> If you use the member AI assistant
            (/ai-chat), what you write is sent in plaintext to Mistral over HTTPS to
            generate a reply. Those conversations are not saved in our Firebase project,
            but they are processed by Mistral under its own terms.
          </li>
          <li>
            <strong>Nothing else.</strong> There is no analytics, advertising, or
            third-party tracking script on this site.
          </li>
        </ul>

        <h2>What other people can see</h2>
        <p>
          Bulletin posts and gallery images are visible to signed-in members. New
          uploads are served through authenticated application routes. Some older
          uploads may still have public storage permissions until organizers review
          and update them, so treat links to older files as shareable.
        </p>
        <p>
          Member chat messages are encrypted in your browser with a shared room key, but
          that key is derived on the server and available to every signed-in member, so
          the chat is community-shared rather than private from the site or other members.
        </p>

        <h2>What we do not collect</h2>
        <p>
          We do not ask for your name, address, phone number, or payment details. There
          is no checkout on this site; donations happen on the partner site you are
          linked to.
        </p>

        <h2>Removing your content</h2>
        <p>
          Ask an organizer to remove a post or image, or email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Deleting a post or
          gallery item also deletes its uploaded image file from storage. The member
          chat has no per-message deletion; rotating the sign-in password blocks new
          sign-ins under the old one, and organizers can remove content on request.
        </p>
      </section>
    </main>
  );
}
