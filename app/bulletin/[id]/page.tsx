'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  FORUM_CATEGORY_LABELS,
  normalizeForumCategory,
  type ForumCategory,
} from '../../../lib/forum-categories';

type Thread = {
  id: string;
  title: string;
  text: string;
  imageUrl?: string | null;
  pinned?: boolean;
  category?: ForumCategory | 'general';
  replyCount?: number;
  createdAt?: unknown;
};

type Reply = {
  id: string;
  text: string;
  sender?: string;
  createdAt?: unknown;
};

function formatTimestamp(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object' && '_seconds' in value) {
    return new Date((value as { _seconds: number })._seconds * 1000).toLocaleString();
  }
  if (typeof value === 'string') return new Date(value).toLocaleString();
  return '';
}

export default function BulletinThreadPage() {
  const params = useParams<{ id: string }>();
  const threadId = params.id;
  const [thread, setThread] = useState<Thread | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [role, setRole] = useState<'member' | 'admin' | null>(null);

  const loadThread = useCallback(async () => {
    setError('');
    try {
      const [threadResponse, repliesResponse, sessionResponse] = await Promise.all([
        fetch(`/api/posts/${threadId}`, { credentials: 'include' }),
        fetch(`/api/posts/${threadId}/replies`, { credentials: 'include' }),
        fetch('/api/auth/session', { credentials: 'include' }),
      ]);
      if (!threadResponse.ok) {
        setError(threadResponse.status === 404
          ? 'This discussion could not be found.'
          : 'This discussion could not be loaded.');
        return;
      }
      const threadData = await threadResponse.json() as { post?: Thread };
      const repliesData = await repliesResponse.json() as { replies?: Reply[] };
      const sessionData = await sessionResponse.json() as { role?: 'member' | 'admin' };
      setThread(threadData.post ?? null);
      setReplies(Array.isArray(repliesData.replies) ? repliesData.replies : []);
      setRole(sessionData.role ?? null);
    } catch {
      setError('This discussion could not be loaded. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    void loadThread();
  }, [loadThread]);

  const addReply = async () => {
    const text = replyText.trim();
    if (!text) return;
    setStatus('Sending…');
    try {
      const response = await fetch(`/api/posts/${threadId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text }),
      });
      if (!response.ok) {
        setStatus('Your reply could not be sent.');
        return;
      }
      setReplyText('');
      setStatus('Reply posted.');
      await loadThread();
    } catch {
      setStatus('Your reply could not be sent. Check your connection.');
    }
  };

  const deleteReply = async (replyId: string) => {
    if (!window.confirm('Delete this reply? This cannot be undone.')) return;
    const response = await fetch(`/api/posts/${threadId}/replies/${replyId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (response.ok) await loadThread();
  };

  const deletePost = async () => {
    if (!window.confirm('Delete this post and its replies? This cannot be undone.')) return;
    const response = await fetch(`/api/posts/${threadId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (response.ok) {
      window.location.assign('/bulletin');
    } else {
      setStatus('This post could not be deleted.');
    }
  };

  return (
    <main className="shell">
      <nav aria-label="Breadcrumb" className="thread-breadcrumb">
        <Link href="/bulletin">Back to community discussions</Link>
      </nav>

      {loading && <p>Loading discussion…</p>}
      {!loading && error && <p className="notice notice--error" role="alert">{error}</p>}
      {!loading && thread && (
        <>
          <section className="featured thread-page" aria-labelledby="thread-title">
            <header className="post__header">
              <h1 id="thread-title">
                {thread.pinned && <span className="pin-badge">Pinned</span>}
                {thread.title}
              </h1>
              <div className="post__meta">
                <span className="category-badge">
                  {thread.category && thread.category !== 'general'
                    ? FORUM_CATEGORY_LABELS[normalizeForumCategory(thread.category) as ForumCategory]
                    : 'General'}
                </span>
                <span className="muted">{formatTimestamp(thread.createdAt)}</span>
              </div>
            </header>

            {thread.imageUrl && (
              <Image
                src={thread.imageUrl}
                alt=""
                width={800}
                height={500}
                className="post-image"
                unoptimized
              />
            )}
            <p className="post__body">{thread.text}</p>
            {role === 'admin' && (
              <div className="post__actions">
                <button type="button" className="btn btn-danger" onClick={() => void deletePost()}>
                  Delete post
                </button>
              </div>
            )}
          </section>

          <section className="featured" aria-labelledby="thread-replies-title">
            <h2 id="thread-replies-title">Replies ({replies.length})</h2>
            <div className="replies">
              {replies.length === 0 && <p className="helper">No replies yet.</p>}
              {replies.map((reply) => (
                <div className="reply" key={reply.id}>
                  <div className="reply__header">
                    <small>{reply.sender || 'Member'} · {formatTimestamp(reply.createdAt)}</small>
                    {role === 'admin' && (
                      <button type="button" className="reply-delete" onClick={() => void deleteReply(reply.id)}>
                        Delete reply
                      </button>
                    )}
                  </div>
                  <p>{reply.text}</p>
                </div>
              ))}
            </div>

            <div className="reply-form">
              <label className="sr-only" htmlFor="thread-reply">Write a reply</label>
              <textarea
                id="thread-reply"
                rows={3}
                maxLength={4000}
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                placeholder="Write a reply…"
              />
              <div className="reply-form__footer">
                <button type="button" className="btn" onClick={() => void addReply()}>
                  Reply
                </button>
                <small className="muted">{replyText.length}/4000</small>
              </div>
              {status && <p className="helper" role="status">{status}</p>}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
