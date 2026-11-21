'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  FORUM_CATEGORIES,
  FORUM_CATEGORY_LABELS,
  normalizeForumCategory,
  type ForumCategory,
} from '../../lib/forum-categories';
import {
  REPORT_REASONS,
  REPORT_REASON_LABELS,
  type ReportReason,
} from '../../lib/reporting';

type Thread = {
  id: string;
  title: string;
  text: string;
  imageUrl?: string | null;
  storagePath?: string | null;
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

type Role = 'member' | 'admin' | null;

function formatTimestamp(value: unknown): string {
  if (value == null) return '';
  // Firestore Timestamp serialized by the API as { _seconds, _nanoseconds }
  if (typeof value === 'object' && '_seconds' in value) {
    return new Date((value as { _seconds: number })._seconds * 1000).toLocaleString();
  }
  if (typeof value === 'string') return new Date(value).toLocaleString();
  return '';
}

export default function BulletinPage() {
  const [role, setRole] = useState<Role>(null);
  const [posts, setPosts] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [category, setCategory] = useState<ForumCategory>('announcements');
  const [categoryFilter, setCategoryFilter] = useState<ForumCategory | 'general' | 'all'>('all');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [posting, setPosting] = useState(false);
  const [postStatus, setPostStatus] = useState('');
  const [postError, setPostError] = useState(false);

  const [openReplies, setOpenReplies] = useState<Record<string, Reply[]>>({});
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [replyStatus, setReplyStatus] = useState<Record<string, string>>({});
  const [reportTarget, setReportTarget] = useState<{
    targetType: 'post' | 'reply';
    targetId: string;
    parentPostId?: string;
  } | null>(null);
  const [reportReason, setReportReason] = useState<ReportReason>('harassment');
  const [reportDetails, setReportDetails] = useState('');
  const [reportStatus, setReportStatus] = useState('');
  const [reportError, setReportError] = useState(false);
  const postedRef = useRef(false);

  const loadRole = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session', { credentials: 'include' });
      if (!response.ok) return;
      const data = await response.json() as { role?: Role };
      setRole(data.role ?? null);
    } catch {
      setRole(null);
    }
  }, []);

  const loadPosts = useCallback(async () => {
    setLoadError('');
    try {
      const response = await fetch('/api/posts?limit=50', { credentials: 'include' });
      if (!response.ok) {
        setLoadError('The bulletin could not be loaded. Try again in a moment.');
        setPosts([]);
        return;
      }
      const data = await response.json() as { posts?: Thread[] };
      setPosts(Array.isArray(data.posts) ? data.posts : []);
    } catch {
      setLoadError('The bulletin could not be loaded. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRole();
    void loadPosts();
  }, [loadRole, loadPosts]);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setImageFile(file);
    if (!file) {
      setImagePreview('');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setTitle('');
    setText('');
    setCategory('announcements');
    setImageFile(null);
    setImagePreview('');
    postedRef.current = false;
  };

  const createPost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    const cleanText = text.trim();
    if (!cleanTitle || !cleanText || posting || postedRef.current) return;

    setPosting(true);
    postedRef.current = true;
    setPostError(false);
    setPostStatus('Posting…');

    const formData = new FormData();
    formData.append('title', cleanTitle);
    formData.append('text', cleanText);
    formData.append('category', category);
    if (imageFile) formData.append('file', imageFile);
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: string } | null;
        setPostError(true);
        setPostStatus(data?.error ?? 'Your post could not be saved. Try again.');
        postedRef.current = false;
        setPosting(false);
        return;
      }

      setPostStatus('Posted.');
      resetForm();
      await loadPosts();
    } catch {
      setPostError(true);
      setPostStatus('Your post could not be saved. Check your connection and try again.');
      postedRef.current = false;
    } finally {
      setPosting(false);
    }
  };

  const loadReplies = useCallback(async (threadId: string) => {
    setReplyStatus((prev) => ({ ...prev, [threadId]: 'Loading replies…' }));
    try {
      const response = await fetch(`/api/posts/${threadId}/replies`, { credentials: 'include' });
      if (!response.ok) {
        setReplyStatus((prev) => ({ ...prev, [threadId]: 'Replies could not be loaded.' }));
        return;
      }
      const data = await response.json() as { replies?: Reply[] };
      setOpenReplies((prev) => ({ ...prev, [threadId]: Array.isArray(data.replies) ? data.replies : [] }));
      setReplyStatus((prev) => ({ ...prev, [threadId]: '' }));
    } catch {
      setReplyStatus((prev) => ({ ...prev, [threadId]: 'Replies could not be loaded.' }));
    }
  }, []);

  const addReply = async (threadId: string) => {
    const value = (replyInputs[threadId] ?? '').trim();
    if (!value) return;

    setReplyStatus((prev) => ({ ...prev, [threadId]: 'Sending…' }));
    try {
      const response = await fetch(`/api/posts/${threadId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text: value }),
      });
      if (!response.ok) {
        setReplyStatus((prev) => ({ ...prev, [threadId]: 'Your reply could not be sent. Try again.' }));
        return;
      }
      setReplyInputs((prev) => ({ ...prev, [threadId]: '' }));
      setReplyStatus((prev) => ({ ...prev, [threadId]: 'Reply posted.' }));
      await loadReplies(threadId);
      await loadPosts();
    } catch {
      setReplyStatus((prev) => ({ ...prev, [threadId]: 'Your reply could not be sent. Check your connection.' }));
    }
  };

  const setPinned = async (thread: Thread) => {
    const pinned = !thread.pinned;
    try {
      const response = await fetch(`/api/posts/${thread.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pinned }),
      });
      if (!response.ok) {
        setLoadError('The pin could not be changed. Try again.');
        return;
      }
      await loadPosts();
    } catch {
      setLoadError('The pin could not be changed. Check your connection.');
    }
  };

  const deletePost = async (threadId: string) => {
    if (!window.confirm('Delete this post and its replies? This cannot be undone.')) return;
    try {
      const response = await fetch(`/api/posts/${threadId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        setLoadError('The post could not be deleted. Try again.');
        return;
      }
      await loadPosts();
    } catch {
      setLoadError('The post could not be deleted. Check your connection.');
    }
  };

  const deleteReply = async (threadId: string, replyId: string) => {
    if (!window.confirm('Delete this reply? This cannot be undone.')) return;
    try {
      const response = await fetch(`/api/posts/${threadId}/replies/${replyId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        setReplyStatus((prev) => ({ ...prev, [threadId]: 'The reply could not be deleted.' }));
        return;
      }
      await loadReplies(threadId);
      await loadPosts();
    } catch {
      setReplyStatus((prev) => ({ ...prev, [threadId]: 'The reply could not be deleted.' }));
    }
  };

  const submitReport = async () => {
    if (!reportTarget) return;
    setReportError(false);
    setReportStatus('Submitting report…');
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...reportTarget,
          reason: reportReason,
          details: reportDetails.trim(),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: string } | null;
        setReportError(true);
        setReportStatus(data?.error ?? 'The report could not be submitted.');
        return;
      }
      setReportStatus('Report submitted privately to organizers.');
      setReportDetails('');
      setReportTarget(null);
    } catch {
      setReportError(true);
      setReportStatus('The report could not be submitted. Check your connection.');
    }
  };

  const copyThreadLink = async (threadId: string) => {
    const url = `${window.location.origin}/bulletin#thread-${threadId}`;
    try {
      await navigator.clipboard.writeText(url);
      setReplyStatus((prev) => ({ ...prev, [threadId]: 'Thread link copied.' }));
    } catch {
      window.history.replaceState(null, '', `#thread-${threadId}`);
      setReplyStatus((prev) => ({ ...prev, [threadId]: 'Link is in the address bar.' }));
    }
  };

  useEffect(() => {
    const threadId = window.location.hash.match(/^#thread-(.+)$/)?.[1];
    if (threadId) void loadReplies(threadId);
  }, [loadReplies]);

  const visiblePosts = posts.filter((post) => (
    categoryFilter === 'all'
      || normalizeForumCategory(post.category) === categoryFilter
  ));
  const pinnedPosts = visiblePosts.filter((post) => post.pinned);
  const regularPosts = visiblePosts.filter((post) => !post.pinned);

  return (
    <main className="shell">
      <section className="hero" aria-labelledby="bulletin-title">
        <div className="hero-overlay">
          <p className="eyebrow">Community forum</p>
          <h1 id="bulletin-title">Community discussions.</h1>
          <p>
            Share announcements, organize action, ask for mutual aid, and keep one another
            informed. Discussions are visible to signed-in members only.
          </p>
        </div>
      </section>

      <section className="featured forum-orientation" aria-labelledby="orientation-title">
        <h2 id="orientation-title">Start here</h2>
        <div className="forum-orientation__grid">
          <p><strong>Choose a category</strong> so the right people can find a discussion.</p>
          <p><strong>Be specific and kind.</strong> Share only what you are comfortable posting.</p>
          <p><strong>Replies stay private.</strong> This area is for signed-in members, not public profiles.</p>
        </div>
      </section>

      <section className="featured" aria-labelledby="new-post-title">
        <h2 id="new-post-title">Start a post</h2>
        <form className="stack-form" onSubmit={(event) => void createPost(event)}>
          <label htmlFor="thread-title">Title</label>
          <input
            id="thread-title"
            type="text"
            value={title}
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            required
          />

          <label htmlFor="thread-text">Message</label>
          <textarea
            id="thread-text"
            rows={4}
            value={text}
            onChange={(event) => setText(event.target.value)}
            required
          />

          <label htmlFor="thread-category">Category</label>
          <select
            id="thread-category"
            value={category}
            onChange={(event) => setCategory(event.target.value as ForumCategory)}
          >
            {FORUM_CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {FORUM_CATEGORY_LABELS[option]}
              </option>
            ))}
          </select>

          <label htmlFor="thread-image">Photo (optional, up to 10 MB)</label>
          <input id="thread-image" type="file" accept="image/*" onChange={handleImageChange} />
          {imagePreview && (
            <Image
              src={imagePreview}
              alt="Selected image preview"
              width={400}
              height={300}
              className="post-image"
              unoptimized
            />
          )}

          <button type="submit" className="btn" disabled={posting} aria-busy={posting}>
            {posting ? 'Posting…' : 'Post to bulletin'}
          </button>
          {postStatus && (
            <p
              className={postError ? 'form-message form-message--error' : 'form-message'}
              role={postError ? 'alert' : 'status'}
            >
              {postStatus}
            </p>
          )}
        </form>
      </section>

      <section className="featured" aria-labelledby="posts-title">
        <div className="section-heading">
          <h2 id="posts-title">Recent posts</h2>
          <button type="button" className="btn btn-secondary" onClick={() => void loadPosts()}>
            Refresh
          </button>
        </div>

        <nav className="category-nav" aria-label="Forum categories">
          <button
            type="button"
            className={`category-btn${categoryFilter === 'all' ? ' category-btn--active' : ''}`}
            aria-pressed={categoryFilter === 'all'}
            onClick={() => setCategoryFilter('all')}
          >
            All discussions
          </button>
          {FORUM_CATEGORIES.map((option) => (
            <button
              type="button"
              key={option}
              className={`category-btn${categoryFilter === option ? ' category-btn--active' : ''}`}
              aria-pressed={categoryFilter === option}
              onClick={() => setCategoryFilter(option)}
            >
              {FORUM_CATEGORY_LABELS[option]}
            </button>
          ))}
          {posts.some((post) => normalizeForumCategory(post.category) === 'general') && (
            <button
              type="button"
              className={`category-btn${categoryFilter === 'general' ? ' category-btn--active' : ''}`}
              aria-pressed={categoryFilter === 'general'}
              onClick={() => setCategoryFilter('general')}
            >
              General
            </button>
          )}
        </nav>

        {loading && <p>Loading posts…</p>}
        {loadError && <p className="notice notice--error" role="alert">{loadError}</p>}
        {!loading && !loadError && visiblePosts.length === 0 && (
          <p>No discussions in this category yet. Start the first one above.</p>
        )}

        {reportTarget && (
          <form
            className="report-form"
            onSubmit={(event) => {
              event.preventDefault();
              void submitReport();
            }}
          >
            <h3>Report {reportTarget.targetType}</h3>
            <label htmlFor="report-reason">Reason</label>
            <select
              id="report-reason"
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value as ReportReason)}
            >
              {REPORT_REASONS.map((reason) => (
                <option key={reason} value={reason}>{REPORT_REASON_LABELS[reason]}</option>
              ))}
            </select>
            <label htmlFor="report-details">Details (optional)</label>
            <textarea
              id="report-details"
              rows={3}
              maxLength={2000}
              value={reportDetails}
              onChange={(event) => setReportDetails(event.target.value)}
            />
            <div className="report-form__actions">
              <button type="submit" className="btn btn-danger">Submit private report</button>
              <button type="button" className="btn btn-secondary" onClick={() => setReportTarget(null)}>
                Cancel
              </button>
            </div>
            {reportStatus && (
              <p className={reportError ? 'form-message form-message--error' : 'form-message'} role={reportError ? 'alert' : 'status'}>
                {reportStatus}
              </p>
            )}
          </form>
        )}

        <div className="post-list">
          {[...pinnedPosts, ...regularPosts].map((post) => (
            <article className="post" id={`thread-${post.id}`} key={post.id}>
              <header className="post__header">
                <h3>
                  {post.pinned && <span className="pin-badge">Pinned</span>}
                  {post.title}
                </h3>
                <div className="post__meta">
                  <span className="category-badge">
                    {post.category && post.category !== 'general'
                      ? FORUM_CATEGORY_LABELS[normalizeForumCategory(post.category) as ForumCategory]
                      : 'General'}
                  </span>
                  <span className="muted">{formatTimestamp(post.createdAt)}</span>
                </div>
              </header>

              {post.imageUrl ? (
                <Image
                  src={post.imageUrl}
                  alt=""
                  width={800}
                  height={500}
                  className="post-image"
                  unoptimized
                />
              ) : null}

              <p className="post__body">{post.text}</p>

              <div className="post__actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => void copyThreadLink(post.id)}
                >
                  Copy link
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => {
                    setReportStatus('');
                    setReportTarget({ targetType: 'post', targetId: post.id });
                  }}
                >
                  Report post
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => void loadReplies(post.id)}
                >
                  {openReplies[post.id] ? 'Reload replies' : `Show replies (${post.replyCount ?? 0})`}
                </button>
                {role === 'admin' && (
                  <>
                    <button type="button" className="btn btn-secondary" onClick={() => void setPinned(post)}>
                      {post.pinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button type="button" className="btn btn-danger" onClick={() => void deletePost(post.id)}>
                      Delete
                    </button>
                  </>
                )}
              </div>

              {openReplies[post.id] && (
                <div className="replies">
                  {openReplies[post.id].length === 0 && <p className="helper">No replies yet.</p>}
                  {openReplies[post.id].map((reply) => (
                    <div className="reply" key={reply.id}>
                      <div className="reply__header">
                        <small>{reply.sender || 'Member'} · {formatTimestamp(reply.createdAt)}</small>
                        <div className="reply__actions">
                          <button
                            type="button"
                            className="reply-report"
                            onClick={() => {
                              setReportStatus('');
                              setReportTarget({
                                targetType: 'reply',
                                targetId: reply.id,
                                parentPostId: post.id,
                              });
                            }}
                          >
                            Report
                          </button>
                          {role === 'admin' && (
                            <button
                              type="button"
                              className="reply-delete"
                              onClick={() => void deleteReply(post.id, reply.id)}
                            >
                              Delete reply
                            </button>
                          )}
                        </div>
                      </div>
                      <p>{reply.text}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="reply-form">
                <label className="sr-only" htmlFor={`reply-${post.id}`}>Write a reply</label>
                <textarea
                  id={`reply-${post.id}`}
                  rows={2}
                  maxLength={4000}
                  value={replyInputs[post.id] ?? ''}
                  onChange={(event) => setReplyInputs((prev) => ({ ...prev, [post.id]: event.target.value }))}
                  placeholder="Write a reply…"
                />
                <div className="reply-form__footer">
                  <button type="button" className="btn" onClick={() => void addReply(post.id)}>
                    Reply
                  </button>
                  <small className="muted">{(replyInputs[post.id] ?? '').length}/4000</small>
                </div>
                {replyStatus[post.id] && <p className="helper">{replyStatus[post.id]}</p>}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
