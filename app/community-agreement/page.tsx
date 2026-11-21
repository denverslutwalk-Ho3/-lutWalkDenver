'use client';

import { useState } from 'react';

export default function CommunityAgreementPage() {
  const [accepted, setAccepted] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState(false);

  const acceptAgreement = async () => {
    setError(false);
    setStatus('Saving…');
    try {
      const response = await fetch('/api/community-agreement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ accepted: true }),
      });
      if (!response.ok) {
        setError(true);
        setStatus('The agreement could not be recorded. Try again.');
        return;
      }
      setAccepted(true);
      setStatus('Community agreement recorded.');
    } catch {
      setError(true);
      setStatus('The agreement could not be recorded. Check your connection.');
    }
  };

  return (
    <main className="shell">
      <section className="hero" aria-labelledby="agreement-title">
        <div className="hero-overlay">
          <p className="eyebrow">Shared expectations</p>
          <h1 id="agreement-title">Community agreement.</h1>
          <p>Read and accept the expectations that help keep this member space safe.</p>
        </div>
      </section>

      <section className="featured" aria-labelledby="agreement-details">
        <h2 id="agreement-details">Our agreement</h2>
        <ol className="plain-list agreement-list">
          <li>Lead with dignity, consent, and bodily autonomy.</li>
          <li>Do not harass, threaten, out, or target another person.</li>
          <li>Do not share private information, stories, images, or locations without consent.</li>
          <li>Challenge ideas without attacking people, and make room for different lived experiences.</li>
          <li>Use moderation and reporting tools rather than escalating conflict.</li>
          <li>Respect organizer decisions and privacy limits for the report queue.</li>
        </ol>
        <p className="helper">
          This agreement records only the member/admin role and acceptance time. It does not create a public profile.
        </p>
        <button
          type="button"
          className="btn"
          disabled={accepted}
          onClick={() => void acceptAgreement()}
        >
          {accepted ? 'Agreement accepted' : 'Accept community agreement'}
        </button>
        {status && (
          <p className={error ? 'form-message form-message--error' : 'form-message'} role={error ? 'alert' : 'status'}>
            {status}
          </p>
        )}
      </section>
    </main>
  );
}
