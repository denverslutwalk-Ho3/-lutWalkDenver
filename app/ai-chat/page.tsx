'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_AGENT } from '../../lib/ai-agents';
import type { AgentOption } from '../../lib/ai-agents';

type ConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const BUILT_IN_AGENT: AgentOption = {
  id: DEFAULT_AGENT.id,
  name: DEFAULT_AGENT.name,
  description: DEFAULT_AGENT.description,
};

export default function AiChatPage() {
  // The conversation lives only in this component's state. Refreshing the
  // page clears it, and nothing is sent to Firestore.
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState('');
  const [agents, setAgents] = useState<AgentOption[]>([BUILT_IN_AGENT]);
  const [agentId, setAgentId] = useState<string>(DEFAULT_AGENT.id);

  useEffect(() => {
    let active = true;

    const loadAgents = async () => {
      try {
        const response = await fetch('/api/ai-agents', { credentials: 'include' });
        if (!response.ok) return;
        const data = await response.json() as { agents?: AgentOption[] };
        if (!active || !Array.isArray(data.agents) || data.agents.length === 0) return;
        setAgents(data.agents);
        setAgentId((current) =>
          data.agents?.some((agent) => agent.id === current) ? current : data.agents![0].id,
        );
      } catch {
        // Keep the built-in assistant available if the list cannot be loaded.
      }
    };

    void loadAgents();
    return () => { active = false; };
  }, []);

  const selectedAgent = agents.find((agent) => agent.id === agentId) ?? agents[0];

  const changeAgent = (nextId: string) => {
    if (nextId === agentId) return;
    setAgentId(nextId);
    // A conversation with one assistant should not silently continue with
    // another, so switching starts fresh.
    setMessages([]);
    setStatus('');
    setDraft('');
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    setStatus('');
    const nextMessages: ConversationMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setDraft('');

    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messages: nextMessages, agentId }),
      });

      const data = await response.json().catch(() => null) as { reply?: unknown; error?: string } | null;

      if (!response.ok || !data || typeof data.reply !== 'string' || !data.reply) {
        setStatus(data?.error ?? 'The assistant could not respond. Try again in a moment.');
        return;
      }

      setMessages([...nextMessages, { role: 'assistant', content: data.reply }]);
    } catch {
      setStatus('The assistant could not be reached. Check your connection and try again.');
    } finally {
      setSending(false);
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setStatus('');
    setDraft('');
  };

  return (
    <main className="shell">
      <section className="hero" aria-labelledby="ai-chat-title">
        <div className="hero-overlay">
          <p className="eyebrow">Member AI assistant</p>
          <h1 id="ai-chat-title">A supportive assistant, separate from the member chat.</h1>
          <p>
            This is a one-on-one assistant. It is not the member chat room, and
            nothing you write here is shared with other members.
          </p>
        </div>
      </section>

      <section className="featured" aria-labelledby="ai-terms-title">
        <div className="section-heading">
          <h2 id="ai-terms-title">Before you start</h2>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={clearConversation}
            disabled={messages.length === 0}
          >
            Clear conversation
          </button>
        </div>

        <div className="notice" role="note">
          <p>
            <strong>This is not private end-to-end encryption.</strong> What you
            write is sent in plaintext to a Mistral AI server over HTTPS so the
            assistant can reply. Please do not share sensitive personal
            information you would not want processed by an AI service.
          </p>
          <p>
            Your messages are not saved by this website, and refreshing the page
            clears the conversation. The assistant is <strong>not a
            therapist</strong> and cannot replace professional care or
            organizing support. It can be wrong or out of date, so check
            important information against vetted sources or ask an organizer.
          </p>
          <p>
            If you are in crisis: in the US, call or text <strong>988</strong>{' '}
            (Suicide &amp; Crisis Lifeline), or call <strong>911</strong> in an
            emergency. In Colorado, Colorado Crisis Services is at{' '}
            <strong>1-844-493-8255</strong> (text TALK to 38255).
          </p>
        </div>
      </section>

      <section className="featured" aria-labelledby="ai-conversation-title">
        <div className="section-heading">
          <h2 id="ai-conversation-title">Conversation</h2>
        </div>

        <div className="stack-form">
          <label htmlFor="ai-agent-select">Assistant</label>
          <select
            id="ai-agent-select"
            className="admin-select"
            value={agentId}
            onChange={(event) => changeAgent(event.target.value)}
            disabled={sending}
          >
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
          {selectedAgent?.description ? (
            <p className="helper">{selectedAgent.description}</p>
          ) : null}
          {agents.length > 1 ? (
            <p className="helper">Switching assistants starts a new conversation.</p>
          ) : null}
        </div>

        {status ? (
          <p className="notice notice--error" role="alert" aria-live="assertive">
            {status}
          </p>
        ) : null}

        <div className="chat-list" role="log" aria-live="polite" aria-label="AI assistant conversation">
          {messages.length === 0 ? (
            <p className="helper">
              No conversation yet. Ask about organizing, community resources, or
              whatever is on your mind.
            </p>
          ) : (
            messages.map((message, index) => (
              <article
                key={index}
                className="chat-message"
                data-role={message.role}
              >
                <header>
                  <strong>{message.role === 'user' ? 'You' : selectedAgent?.name ?? 'Assistant'}</strong>
                </header>
                <p>{message.content}</p>
              </article>
            ))
          )}
        </div>

        <div className="stack-form">
          <label htmlFor="ai-chat-draft">Message the assistant</label>
          <textarea
            id="ai-chat-draft"
            rows={3}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={sending}
          />
          <button
            type="button"
            className="btn"
            onClick={() => void send()}
            disabled={sending || !draft.trim()}
            aria-busy={sending}
          >
            {sending ? 'Thinking…' : 'Send message'}
          </button>
        </div>
      </section>
    </main>
  );
}
