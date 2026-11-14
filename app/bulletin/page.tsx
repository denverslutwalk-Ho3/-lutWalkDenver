'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

type Thread = {
  id: string;
  title: string;
  text: string;
  imageUrl?: string | null;
  storagePath?: string | null;
  pinned?: boolean;
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [posting, setPosting] = useState(false);
  const [postStatus, setPostStatus] = useState('');
  const [postError, setPostError] = useState(false);

  const [openReplies, setOpenReplies] = useState<Record<string, Reply[]>>({});
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [replyStatus, setReplyStatus] = useState<Record<string, string>>({});
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

    let imageUrl: string | null = null;
    let storagePath: string | null = null;

    if (imageFile) {
      const formData = new FormData();
      formData.append('file', imageFile);
      formData.append('folder', 'posts');
      try {
        const upload = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: formData });
        if (!upload.ok) {
          const data = await upload.json().catch(() => null) as { error?: string } | null;
          setPostError(true);
          setPostStatus(data?.error ?? 'The image could not be uploaded. Try posting without it.');
          postedRef.current = false;
          setPosting(false);
          return;
        }
        const data = await upload.json() as { url?: string; path?: string };
        imageUrl = data.url ?? null;
        storagePath = data.path ?? null;
      } catch {
        setPostError(true);
        setPostStatus('The image could not be uploaded. Try posting without it.');
        postedRef.current = false;
        setPosting(false);
        return;
      }
    }

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: cleanTitle, text: cleanText, imageUrl, storagePath }),
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

  const loadReplies = async (threadId: string) => {
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
  };

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

  return (
    <main className="shell">
      <section className="hero" aria-labelledby="bulletin-title">
        <div className="hero-overlay">
          <p className="eyebrow">Bulletin board</p>
          <h1 id="bulletin-title">Announcements, requests, and updates.</h1>
          <p>
            Post announcements, mutual aid requests, and volunteer needs. Replies are
            visible to signed-in members only.
          </p>
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

        {loading && <p>Loading posts…</p>}
        {loadError && <p className="notice notice--error" role="alert">{loadError}</p>}
        {!loading && !loadError && posts.length === 0 && (
          <p>No posts yet. Start the first one above.</p>
        )}

        <div className="post-list">
          {posts.map((post) => (
            <article className="post" key={post.id}>
              <header className="post__header">
                <h3>
                  {post.pinned && <span className="pin-badge">Pinned</span>}
                  {post.title}
                </h3>
                <span className="muted">{formatTimestamp(post.createdAt)}</span>
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
                      <small>{reply.sender || 'Member'} · {formatTimestamp(reply.createdAt)}</small>
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
                  value={replyInputs[post.id] ?? ''}
                  onChange={(event) => setReplyInputs((prev) => ({ ...prev, [post.id]: event.target.value }))}
                  placeholder="Write a reply…"
                />
                <button type="button" className="btn" onClick={() => void addReply(post.id)}>
                  Reply
                </button>
                {replyStatus[post.id] && <p className="helper">{replyStatus[post.id]}</p>}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
