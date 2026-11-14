'use client';

import { useCallback, useEffect, useState } from 'react';
import { decryptText, encryptText, importKeyFromBase64 } from '../../lib/e2e-chat';
import type { E2EEncryptedPayload } from '../../lib/e2e-chat';

type ChatMessage = {
  id: string;
  sender: string;
  text: string;
  time: string;
  readable: boolean;
};

const UNREADABLE = 'This message was encrypted with an older key and cannot be read here.';

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState('Loading the member chat…');
  const [key, setKey] = useState<CryptoKey | null>(null);
  const [ready, setReady] = useState(false);
  const [sending, setSending] = useState(false);

  const loadMessages = useCallback(async (cryptoKey: CryptoKey) => {
    try {
      const response = await fetch('/api/messages', { credentials: 'include' });
      if (!response.ok) {
        setStatus('The chat could not be loaded. Try again in a moment.');
        return;
      }

      const data = await response.json() as {
        messages?: Array<{ id: string; sender: string; text: string; time: string }>;
      };

      const next: ChatMessage[] = [];
      for (const message of data.messages ?? []) {
        try {
          const payload = JSON.parse(message.text) as E2EEncryptedPayload;
          const plaintext = await decryptText(payload, cryptoKey);
          next.push({ ...message, text: plaintext, readable: true });
        } catch {
          next.push({ ...message, text: UNREADABLE, readable: false });
        }
      }

      setMessages(next);
      setStatus(next.length === 0 ? 'No messages yet. Say hello.' : '');
    } catch {
      setStatus('The chat could not be loaded. Check your connection and try again.');
    }
  }, []);

  useEffect(() => {
    let active = true;

    const start = async () => {
      try {
        const response = await fetch('/api/messages/key', { credentials: 'include' });
        if (!response.ok) {
          if (active) setStatus('The chat is not available right now. Try again later.');
          return;
        }
        const data = await response.json() as { key?: string };
        if (!data.key) {
          if (active) setStatus('The chat is not configured yet.');
          return;
        }
        const cryptoKey = await importKeyFromBase64(data.key);
        if (!active) return;
        setKey(cryptoKey);
        setReady(true);
        await loadMessages(cryptoKey);
      } catch {
        if (active) setStatus('The chat could not be opened. Try again later.');
      }
    };

    void start();
    return () => { active = false; };
  }, [loadMessages]);

  useEffect(() => {
    if (!key) return;
    const interval = setInterval(() => { void loadMessages(key); }, 20_000);
    return () => clearInterval(interval);
  }, [key, loadMessages]);

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || !key || sending) return;

    setSending(true);
    setStatus('Sending…');
    try {
      const payload = await encryptText(text, key);
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          text: JSON.stringify(payload),
          sender: 'Member',
          encrypted: true,
        }),
      });

      if (!response.ok) {
        setStatus('Your message could not be sent. Try again.');
        return;
      }

      setDraft('');
      setStatus('Message sent.');
      await loadMessages(key);
    } catch {
      setStatus('Your message could not be sent. Check your connection.');
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="shell">
      <section className="hero" aria-labelledby="chat-title">
        <div className="hero-overlay">
          <p className="eyebrow">Member chat</p>
          <h1 id="chat-title">Private conversations for the community.</h1>
          <p>
            Messages are encrypted in your browser with a shared room key before
            they are stored. The key is derived on the server and is available
            to every signed-in member, so treat this space as community-shared
            rather than private.
          </p>
        </div>
      </section>

      <section className="featured" aria-labelledby="messages-title">
        <div className="section-heading">
          <h2 id="messages-title">Chat room</h2>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => { if (key) void loadMessages(key); }}
            disabled={!ready}
          >
            Refresh
          </button>
        </div>

        <p className={status.startsWith('The chat') || status.includes('could not') ? 'notice notice--error' : 'helper'} role="status" aria-live="polite">
          {status}
        </p>

        <div className="chat-list" role="log" aria-live="polite" aria-label="Chat messages">
          {messages.map((message) => (
            <article key={message.id} className="chat-message">
              <header>
                <strong>{message.sender}</strong>
                <span className="muted">{message.time}</span>
              </header>
              <p className={message.readable ? undefined : 'muted'}>{message.text}</p>
            </article>
          ))}
        </div>

        <div className="stack-form">
          <label htmlFor="chat-draft">New message</label>
          <textarea
            id="chat-draft"
            rows={3}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={!ready}
          />
          <button
            type="button"
            className="btn"
            onClick={() => void sendMessage()}
            disabled={!ready || sending}
            aria-busy={sending}
          >
            {sending ? 'Sending…' : 'Send message'}
          </button>
        </div>
      </section>
    </main>
  );
}
