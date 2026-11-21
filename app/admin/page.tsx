'use client';

import Image from 'next/image';
import { useEffect, useState, useCallback } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { DEFAULT_AGENT_PROMPT } from '../../lib/ai-chat';
import {
  MAX_AGENT_DESCRIPTION_LENGTH,
  MAX_AGENT_NAME_LENGTH,
  MAX_AGENT_PROMPT_LENGTH,
} from '../../lib/ai-agents';

// ── Types ──────────────────────────────────────────────────────────────────

type Post = {
  id: string;
  title: string;
  text: string;
  pinned?: boolean;
  replyCount?: number;
  createdAt?: string;
};

type AdminEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  archived?: boolean;
};

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  storagePath?: string;
  category: string;
  stock: number;
};

type Stats = {
  posts: number;
  events: number;
  products: number;
};

type GalleryAsset = {
  id: string;
  title: string;
  description: string;
  collection: 'archive' | 'community';
  category: 'photos' | 'flyers' | 'press' | 'zines' | 'general';
  imageUrl: string;
};

type AiAgent = {
  id: string;
  name: string;
  description: string;
  systemPrompt?: string;
  builtIn?: boolean;
};

type ModerationReport = {
  id: string;
  targetType: 'post' | 'reply';
  targetId: string;
  parentPostId?: string | null;
  reason: string;
  details: string;
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  resolutionNotes: string;
  reporterRole: 'member' | 'admin';
  createdAt?: unknown;
};

function formatReportTimestamp(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object' && '_seconds' in value) {
    return new Date((value as { _seconds: number })._seconds * 1000).toLocaleString();
  }
  if (typeof value === 'string') return new Date(value).toLocaleString();
  return '';
}

// ── Component ──────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<'stats' | 'moderation' | 'reports' | 'events' | 'products' | 'agents' | 'archive'>('stats');

  const [stats, setStats] = useState<Stats>({ posts: 0, events: 0, products: 0 });
  const [posts, setPosts] = useState<Post[]>([]);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [galleryAssets, setGalleryAssets] = useState<GalleryAsset[]>([]);
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [reportStatus, setReportStatus] = useState('');

  // Event form
  const [evtTitle, setEvtTitle] = useState('');
  const [evtDate, setEvtDate] = useState('');
  const [evtTime, setEvtTime] = useState('');
  const [evtLocation, setEvtLocation] = useState('');
  const [evtDescription, setEvtDescription] = useState('');
  const [evtStatus, setEvtStatus] = useState('');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Product form
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodCategory, setProdCategory] = useState('apparel');
  const [prodStock, setProdStock] = useState('');
  const [prodImageFile, setProdImageFile] = useState<File | null>(null);
  const [prodStatus, setProdStatus] = useState('');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Agent form
  const [agentName, setAgentName] = useState('');
  const [agentDescription, setAgentDescription] = useState('');
  const [agentPrompt, setAgentPrompt] = useState(DEFAULT_AGENT_PROMPT);
  const [agentStatus, setAgentStatus] = useState('');
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);

  // Archive upload
  const [archiveFile, setArchiveFile] = useState<File | null>(null);
  const [archiveCollection, setArchiveCollection] = useState<'archive' | 'community'>('archive');
  const [archiveCategory, setArchiveCategory] = useState<'photos' | 'flyers' | 'press' | 'zines' | 'general'>('photos');
  const [archiveTitle, setArchiveTitle] = useState('');
  const [archiveDescription, setArchiveDescription] = useState('');
  const [archiveStatus, setArchiveStatus] = useState('');
  const [archiveUrl, setArchiveUrl] = useState('');

  // ── Data fetching ────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    const [postsRes, eventsRes, productsRes, galleryRes, agentsRes, reportsRes] = await Promise.allSettled([
      fetch('/api/posts?limit=50', { credentials: 'include' }),
      fetch('/api/events?limit=50', { credentials: 'include' }),
      fetch('/api/products', { credentials: 'include' }),
      fetch('/api/gallery?limit=80', { credentials: 'include' }),
      fetch('/api/ai-agents', { credentials: 'include' }),
      fetch('/api/reports?limit=100', { credentials: 'include' }),
    ]);

    if (postsRes.status === 'fulfilled' && postsRes.value.ok) {
      const json = await postsRes.value.json() as { posts?: Post[] };
      const fetched = json.posts ?? [];
      setPosts(fetched);
      setStats((s) => ({ ...s, posts: fetched.length }));
    }
    if (eventsRes.status === 'fulfilled' && eventsRes.value.ok) {
      const json = await eventsRes.value.json() as { events?: AdminEvent[] };
      const fetched = json.events ?? [];
      setEvents(fetched);
      setStats((s) => ({ ...s, events: fetched.length }));
    }
    if (productsRes.status === 'fulfilled' && productsRes.value.ok) {
      const json = await productsRes.value.json() as { products?: Product[] };
      const fetched = json.products ?? [];
      setProducts(fetched);
      setStats((s) => ({ ...s, products: fetched.length }));
    }
    if (galleryRes.status === 'fulfilled' && galleryRes.value.ok) {
      const json = await galleryRes.value.json() as { assets?: GalleryAsset[] };
      setGalleryAssets(json.assets ?? []);
    }
    if (agentsRes.status === 'fulfilled' && agentsRes.value.ok) {
      const json = await agentsRes.value.json() as { agents?: AiAgent[] };
      setAgents(json.agents ?? []);
    } else {
      setAgentStatus('Assistants could not be loaded. Check the Firebase configuration.');
    }
    if (reportsRes.status === 'fulfilled' && reportsRes.value.ok) {
      const json = await reportsRes.value.json() as { reports?: ModerationReport[] };
      setReports(json.reports ?? []);
    } else {
      setReportStatus('Reports could not be loaded.');
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  // ── Moderation ───────────────────────────────────────────────────────────

  const deletePost = async (id: string) => {
    if (!window.confirm('Delete this post and its replies? This cannot be undone.')) return;
    const response = await fetch(`/api/posts/${id}`, { method: 'DELETE', credentials: 'include' });
    if (!response.ok) {
      void loadData();
      return;
    }
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const togglePin = async (post: Post) => {
    const pinned = !post.pinned;
    const response = await fetch(`/api/posts/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ pinned }),
    });
    if (!response.ok) {
      void loadData();
      return;
    }
    setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, pinned } : p));
  };

  const updateReport = async (
    report: ModerationReport,
    status: ModerationReport['status'],
    resolutionNotes: string,
  ) => {
    setReportStatus('');
    const response = await fetch(`/api/reports/${report.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status, resolutionNotes }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null) as { error?: string } | null;
      setReportStatus(data?.error ?? 'The report could not be updated.');
      return;
    }
    setReportStatus('Report updated.');
    await loadData();
  };

  // ── Events ───────────────────────────────────────────────────────────────

  const resetEventForm = (status = '') => {
    setEvtTitle('');
    setEvtDate('');
    setEvtTime('');
    setEvtLocation('');
    setEvtDescription('');
    setEditingEventId(null);
    setEvtStatus(status);
  };

  const startEditEvent = (event: AdminEvent) => {
    setEditingEventId(event.id);
    setEvtTitle(event.title);
    setEvtDate(event.date);
    setEvtTime(event.time);
    setEvtLocation(event.location);
    setEvtDescription(event.description);
    setEvtStatus(`Editing "${event.title}". Save to update it.`);
  };

  const saveEvent = async (e: FormEvent) => {
    e.preventDefault();
    setEvtStatus('Saving…');
    const res = await fetch(editingEventId ? `/api/events/${editingEventId}` : '/api/events', {
      method: editingEventId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        title: evtTitle,
        date: evtDate,
        time: evtTime,
        location: evtLocation,
        description: evtDescription,
      }),
    });
    if (res.ok) {
      resetEventForm(editingEventId ? 'Event updated' : 'Event created');
      void loadData();
    } else {
      setEvtStatus(editingEventId ? 'Error updating event' : 'Error creating event');
    }
  };

  const deleteEvent = async (id: string) => {
    if (!window.confirm('Delete this event? This cannot be undone.')) return;
    const response = await fetch(`/api/events/${id}`, { method: 'DELETE', credentials: 'include' });
    if (!response.ok) {
      void loadData();
      return;
    }
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const archiveEvent = async (event: AdminEvent) => {
    const archived = !event.archived;
    const response = await fetch(`/api/events/${event.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ archived }),
    });
    if (!response.ok) {
      void loadData();
      return;
    }
    setEvents((prev) => prev.map((item) => item.id === event.id ? { ...item, archived } : item));
  };

  // ── Products ─────────────────────────────────────────────────────────────

  const uploadProductImage = async (file: File): Promise<{ url: string; path: string } | null> => {
    const form = new FormData();
    form.append('file', file);
    form.append('folder', 'products');
    const res = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: form });
    if (!res.ok) return null;
    const json = await res.json() as { url?: string; path?: string };
    return json.url && json.path ? { url: json.url, path: json.path } : null;
  };

  const resetProductForm = () => {
    setProdName(''); setProdDesc(''); setProdPrice(''); setProdStock('');
    setProdImageFile(null); setEditingProductId(null); setProdStatus('');
  };

  const startEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setProdName(product.name);
    setProdDesc(product.description);
    setProdPrice((product.price / 100).toFixed(2));
    setProdCategory(product.category);
    setProdStock(String(product.stock));
    setProdImageFile(null);
    setProdStatus('Editing product. Save to update it.');
  };

  const saveProduct = async (e: FormEvent) => {
    e.preventDefault();
    setProdStatus('Saving…');
    let uploadedImage: { url: string; path: string } | null = null;
    if (prodImageFile) {
      uploadedImage = await uploadProductImage(prodImageFile);
      if (!uploadedImage) {
        setProdStatus('The image could not be uploaded. Try again or save without it.');
        return;
      }
    }

    const payload: Record<string, unknown> = {
      name: prodName,
      description: prodDesc,
      price: Math.round(parseFloat(prodPrice) * 100) || 0,
      category: prodCategory,
      stock: parseInt(prodStock, 10) || 0,
    };
    if (uploadedImage) {
      payload.imageUrl = uploadedImage.url;
      payload.storagePath = uploadedImage.path;
    }

    const res = await fetch(
      editingProductId ? `/api/products/${editingProductId}` : '/api/products',
      {
        method: editingProductId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      },
    );

    if (res.ok) {
      setProdStatus(editingProductId ? 'Product updated' : 'Product created');
      resetProductForm();
      void loadData();
    } else {
      const result = await res.json() as { error?: unknown };
      setProdStatus(
        typeof result.error === 'string'
          ? result.error
          : editingProductId ? 'Error updating product' : 'Error creating product',
      );
    }
  };

  const deleteProduct = async (id: string) => {
    const response = await fetch(`/api/products/${id}`, { method: 'DELETE', credentials: 'include' });
    if (!response.ok) {
      const result = await response.json() as { error?: unknown };
      await loadData();
      setProdStatus(typeof result.error === 'string' ? result.error : 'Error deleting product');
      return;
    }
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  // ── Agents ───────────────────────────────────────────────────────────────

  const resetAgentForm = (status = '') => {
    setAgentName('');
    setAgentDescription('');
    setAgentPrompt(DEFAULT_AGENT_PROMPT);
    setEditingAgentId(null);
    setAgentStatus(status);
  };

  const startEditAgent = (agent: AiAgent) => {
    setEditingAgentId(agent.id);
    setAgentName(agent.name);
    setAgentDescription(agent.description);
    setAgentPrompt(agent.systemPrompt ?? DEFAULT_AGENT_PROMPT);
    setAgentStatus(`Editing "${agent.name}". Save to update it.`);
  };

  const saveAgent = async (e: FormEvent) => {
    e.preventDefault();
    setAgentStatus('Saving…');
    const res = await fetch(
      editingAgentId ? `/api/ai-agents/${editingAgentId}` : '/api/ai-agents',
      {
        method: editingAgentId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: agentName,
          description: agentDescription,
          systemPrompt: agentPrompt,
        }),
      },
    );

    if (res.ok) {
      resetAgentForm(editingAgentId ? 'Assistant updated' : 'Assistant created');
      void loadData();
    } else {
      const result = await res.json().catch(() => null) as { error?: unknown } | null;
      setAgentStatus(
        typeof result?.error === 'string' ? result.error : 'Error saving assistant',
      );
    }
  };

  const deleteAgent = async (agent: AiAgent) => {
    if (!window.confirm(`Delete "${agent.name}"? This cannot be undone.`)) return;
    const response = await fetch(`/api/ai-agents/${agent.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      const result = await response.json().catch(() => null) as { error?: unknown } | null;
      setAgentStatus(
        typeof result?.error === 'string' ? result.error : 'Error deleting assistant',
      );
      void loadData();
      return;
    }
    setAgents((prev) => prev.filter((item) => item.id !== agent.id));
  };

  // ── Archive ───────────────────────────────────────────────────────────────

  const uploadArchiveFile = async (e: FormEvent) => {
    e.preventDefault();
    if (!archiveFile) return;
    const title = archiveTitle.trim();
    if (!title) {
      setArchiveStatus('Title is required');
      return;
    }

    setArchiveStatus('Uploading…');
    const form = new FormData();
    form.append('file', archiveFile);
    form.append('folder', `${archiveCollection}/${archiveCategory}`);
    const res = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: form });
    if (res.ok) {
      const json = await res.json() as { url?: string; path?: string };
      const url = json.url ?? '';
      setArchiveUrl(url);

      const metaRes = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title,
          description: archiveDescription,
          collection: archiveCollection,
          category: archiveCategory,
          imageUrl: url,
          storagePath: json.path ?? '',
          contentType: archiveFile.type,
        }),
      });

      if (metaRes.ok) {
        setArchiveStatus('Upload and gallery publish complete');
        setArchiveFile(null);
        setArchiveTitle('');
        setArchiveDescription('');
        void loadData();
      } else {
        setArchiveStatus('Uploaded file, but failed to save gallery metadata');
      }
    } else {
      setArchiveStatus('Upload failed');
    }
  };

  const deleteGalleryAsset = async (id: string) => {
    const response = await fetch(`/api/gallery/${id}`, { method: 'DELETE', credentials: 'include' });
    if (!response.ok) {
      void loadData();
      return;
    }
    setGalleryAssets((prev) => prev.filter((asset) => asset.id !== id));
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: 'stats', label: 'Statistics' },
    { key: 'moderation', label: 'Moderation' },
    { key: 'reports', label: 'Reports' },
    { key: 'events', label: 'Events' },
    { key: 'products', label: 'Products' },
    { key: 'agents', label: 'Agents' },
    { key: 'archive', label: 'Archive' },
  ];

  return (
    <main className="shell">
      <section className="hero" aria-labelledby="admin-title">
        <div className="hero-overlay">
          <p className="eyebrow">Administrator dashboard</p>
          <h1 id="admin-title">Manage the community hub.</h1>
          <p>Moderate content, manage events, products, and archive uploads.</p>
        </div>
      </section>

      {/* Tab navigation */}
      <nav aria-label="Admin sections" className="admin-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`admin-tab ${activeTab === tab.key ? 'admin-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
            aria-current={activeTab === tab.key ? 'page' : undefined}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section className="featured">

        {/* ── Statistics ───────────────────────────────────────────────── */}
        {activeTab === 'stats' && (
          <>
            <h2>Community statistics</h2>
            <div className="notice-grid">
              <article>
                <h3>{stats.posts}</h3>
                <p>Bulletin posts</p>
              </article>
              <article>
                <h3>{stats.events}</h3>
                <p>Upcoming events</p>
              </article>
              <article>
                <h3>{stats.products}</h3>
                <p>Store products</p>
              </article>
            </div>
          </>
        )}

        {/* ── Moderation ───────────────────────────────────────────────── */}
        {activeTab === 'moderation' && (
          <>
            <h2>Content moderation controls</h2>
            {posts.length === 0 && <p>No posts yet.</p>}
            <div className="admin-list">
              {posts.map((post) => (
                <article key={post.id} className="admin-list-item">
                  <div className="admin-list-meta">
                    <strong>{post.title}</strong>
                    {post.pinned && <span className="pin-badge">Pinned</span>}
                    <span className="muted"> · {post.replyCount ?? 0} replies</span>
                  </div>
                  <p className="admin-list-body">{post.text}</p>
                  <div className="admin-list-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => void togglePin(post)}
                    >
                      {post.pinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => void deletePost(post.id)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {/* ── Reports ───────────────────────────────────────────────────── */}
        {activeTab === 'reports' && (
          <>
            <h2>Restricted report queue</h2>
            <p className="helper">Visible to organizers only. Resolution notes are retained in the audit record.</p>
            {reportStatus && <p className="form-message" role="status">{reportStatus}</p>}
            {reports.length === 0 && <p>No reports yet.</p>}
            <div className="admin-list">
              {reports.map((report) => (
                <article key={report.id} className="admin-list-item">
                  <div className="admin-list-meta">
                    <strong>{report.reason.replaceAll('-', ' ')}</strong>
                    <span className="muted"> · {report.status} · {report.targetType}</span>
                    <span className="muted"> · {formatReportTimestamp(report.createdAt)}</span>
                  </div>
                  <p className="admin-list-body">
                    <strong>Target:</strong> {report.parentPostId ? `${report.parentPostId} / ${report.targetId}` : report.targetId}
                  </p>
                  {report.details && <p className="admin-list-body">{report.details}</p>}
                  {report.resolutionNotes && (
                    <p className="admin-list-body"><strong>Resolution:</strong> {report.resolutionNotes}</p>
                  )}
                  <div className="admin-list-actions">
                    {report.status === 'open' && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => void updateReport(report, 'reviewing', report.resolutionNotes)}
                      >
                        Mark reviewing
                      </button>
                    )}
                    {report.status !== 'resolved' && report.status !== 'dismissed' && (
                      <>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => {
                            const notes = window.prompt('Resolution notes')?.trim();
                            if (notes) void updateReport(report, 'resolved', notes);
                          }}
                        >
                          Resolve
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => {
                            const notes = window.prompt('Dismissal notes')?.trim();
                            if (notes) void updateReport(report, 'dismissed', notes);
                          }}
                        >
                          Dismiss
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {/* ── Events ───────────────────────────────────────────────────── */}
        {activeTab === 'events' && (
          <>
            <h2>Event management controls</h2>
            <form className="admin-form" onSubmit={(e) => void saveEvent(e)}>
              <h3>{editingEventId ? 'Edit event' : 'Add event'}</h3>
              <label htmlFor="evt-title">Title</label>
              <input id="evt-title" type="text" value={evtTitle} onChange={(e) => setEvtTitle(e.target.value)} required />

              <label htmlFor="evt-date">Date</label>
              <input id="evt-date" type="date" value={evtDate} onChange={(e) => setEvtDate(e.target.value)} required />

              <label htmlFor="evt-time">Time</label>
              <input id="evt-time" type="text" placeholder="e.g. 4:00 PM" value={evtTime} onChange={(e) => setEvtTime(e.target.value)} />

              <label htmlFor="evt-location">Location</label>
              <input id="evt-location" type="text" value={evtLocation} onChange={(e) => setEvtLocation(e.target.value)} />

              <label htmlFor="evt-description">Description</label>
              <textarea id="evt-description" rows={4} value={evtDescription} onChange={(e) => setEvtDescription(e.target.value)} />

              <button type="submit" className="btn">
                {editingEventId ? 'Save changes' : 'Add event'}
              </button>
              {editingEventId && (
                <button type="button" className="btn btn-secondary" onClick={() => resetEventForm()}>
                  Cancel editing
                </button>
              )}
              {evtStatus && <p className="helper">{evtStatus}</p>}
            </form>

            <h3>Edit or delete events</h3>
            <div className="admin-list">
              {events.map((ev) => (
                <article key={ev.id} className="admin-list-item">
                  <div className="admin-list-meta">
                    <strong>{ev.title}</strong>
                    <span className="muted"> · {ev.date}</span>
                    {ev.archived && <span className="pin-badge">Archived</span>}
                  </div>
                  <p className="admin-list-body">{ev.location}</p>
                  <div className="admin-list-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => startEditEvent(ev)}
                      aria-label={`Edit ${ev.title}`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => void archiveEvent(ev)}
                    >
                      {ev.archived ? 'Restore' : 'Archive'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => void deleteEvent(ev.id)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
              {events.length === 0 && <p>No events yet.</p>}
            </div>
          </>
        )}

        {/* ── Products ─────────────────────────────────────────────────── */}
        {activeTab === 'products' && (
          <>
            <h2>Store management controls</h2>
            <form className="admin-form" onSubmit={(e) => void saveProduct(e)}>
              <h3>{editingProductId ? 'Edit product' : 'Add product'}</h3>
              <label htmlFor="prod-name">Product name</label>
              <input id="prod-name" type="text" value={prodName} onChange={(e) => setProdName(e.target.value)} required />

              <label htmlFor="prod-desc">Description</label>
              <textarea id="prod-desc" rows={3} value={prodDesc} onChange={(e) => setProdDesc(e.target.value)} />

              <label htmlFor="prod-price">Price (USD)</label>
              <input id="prod-price" type="number" min="0" step="0.01" placeholder="0.00" value={prodPrice} onChange={(e) => setProdPrice(e.target.value)} required />

              <label htmlFor="prod-category">Category</label>
              <select id="prod-category" value={prodCategory} onChange={(e) => setProdCategory(e.target.value)} className="admin-select">
                {['apparel', 'stickers', 'zines', 'posters', 'books', 'other'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <label htmlFor="prod-stock">Stock</label>
              <input id="prod-stock" type="number" min="0" placeholder="0" value={prodStock} onChange={(e) => setProdStock(e.target.value)} />

              <label htmlFor="prod-image">Product image</label>
              <input
                id="prod-image"
                type="file"
                accept="image/*"
                onChange={(e: ChangeEvent<HTMLInputElement>) => setProdImageFile(e.target.files?.[0] ?? null)}
              />

              <button type="submit" className="btn">
                {editingProductId ? 'Save changes' : 'Add product'}
              </button>
              {editingProductId && (
                <button type="button" className="btn btn-secondary" onClick={resetProductForm}>
                  Cancel edit
                </button>
              )}
              {prodStatus && <p className="helper">{prodStatus}</p>}
            </form>

            <h3>Edit or delete products</h3>
            <div className="admin-list">
              {products.map((prod) => (
                <article key={prod.id} className="admin-list-item">
                  {prod.imageUrl && (
                    <Image
                      src={prod.imageUrl}
                      alt={prod.name}
                      width={80}
                      height={80}
                      className="admin-product-img"
                      unoptimized
                    />
                  )}
                  <div className="admin-list-meta">
                    <strong>{prod.name}</strong>
                    <span className="muted"> · ${(prod.price / 100).toFixed(2)} · {prod.category} · {prod.stock} in stock</span>
                  </div>
                  <div className="admin-list-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => startEditProduct(prod)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => void deleteProduct(prod.id)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
              {products.length === 0 && <p>No products yet.</p>}
            </div>
          </>
        )}

        {/* ── Agents ────────────────────────────────────────────────────── */}
        {activeTab === 'agents' && (
          <>
            <h2>AI assistant agents</h2>
            <div className="notice" role="note">
              <p>
                Every assistant automatically receives the shared Anchor / Mirror /
                Reframe / Rapport guardrails and crisis guidance. Editing a prompt
                changes the assistant&apos;s voice and focus, not those limits.
              </p>
              <p>
                Anyone with the shared admin password can change what every
                member&apos;s assistant says. Prompt-level guardrails are a mitigation
                only; they are not a verified reduction in bias or hallucination.
              </p>
            </div>

            <form className="admin-form" onSubmit={(e) => void saveAgent(e)}>
              <h3>{editingAgentId ? 'Edit assistant' : 'Add assistant'}</h3>

              <label htmlFor="agent-name">Name</label>
              <input
                id="agent-name"
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                maxLength={MAX_AGENT_NAME_LENGTH}
                required
              />

              <label htmlFor="agent-description">Who is this for?</label>
              <textarea
                id="agent-description"
                rows={2}
                value={agentDescription}
                onChange={(e) => setAgentDescription(e.target.value)}
                maxLength={MAX_AGENT_DESCRIPTION_LENGTH}
                required
              />

              <label htmlFor="agent-prompt">System prompt</label>
              <textarea
                id="agent-prompt"
                rows={12}
                value={agentPrompt}
                onChange={(e) => setAgentPrompt(e.target.value)}
                maxLength={MAX_AGENT_PROMPT_LENGTH}
                required
              />
              <p className="helper">
                New assistants start with the full trauma-informed guardrail text.
                The server re-applies the shared guardrails on every request.
              </p>

              <button type="submit" className="btn">
                {editingAgentId ? 'Save changes' : 'Add assistant'}
              </button>
              {editingAgentId && (
                <button type="button" className="btn btn-secondary" onClick={() => resetAgentForm()}>
                  Cancel editing
                </button>
              )}
              {agentStatus && <p className="helper">{agentStatus}</p>}
            </form>

            <h3>Edit or delete assistants</h3>
            <div className="admin-list">
              {agents.map((agent) => (
                <article key={agent.id} className="admin-list-item">
                  <div className="admin-list-meta">
                    <strong>{agent.name}</strong>
                    {agent.builtIn && <span className="pin-badge">Built-in</span>}
                  </div>
                  <p className="admin-list-body">{agent.description}</p>
                  {!agent.builtIn && (
                    <div className="admin-list-actions">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => startEditAgent(agent)}
                        aria-label={`Edit ${agent.name}`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => void deleteAgent(agent)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </article>
              ))}
              {agents.length === 0 && <p>No assistants yet.</p>}
            </div>
          </>
        )}

        {/* ── Archive ───────────────────────────────────────────────────── */}
        {activeTab === 'archive' && (
          <>
            <h2>Archive controls</h2>
            <form className="admin-form" onSubmit={(e) => void uploadArchiveFile(e)}>
              <label htmlFor="archive-collection">Collection</label>
              <select
                id="archive-collection"
                value={archiveCollection}
                onChange={(e) => setArchiveCollection(e.target.value as 'archive' | 'community')}
                className="admin-select"
              >
                {['archive', 'community'].map((collection) => (
                  <option key={collection} value={collection}>{collection}</option>
                ))}
              </select>

              <label htmlFor="archive-category">Category</label>
              <select
                id="archive-category"
                value={archiveCategory}
                onChange={(e) => setArchiveCategory(e.target.value as 'photos' | 'flyers' | 'press' | 'zines' | 'general')}
                className="admin-select"
              >
                {['photos', 'flyers', 'press', 'zines', 'general'].map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              <label htmlFor="archive-title">Title</label>
              <input
                id="archive-title"
                type="text"
                value={archiveTitle}
                onChange={(e) => setArchiveTitle(e.target.value)}
                required
              />

              <label htmlFor="archive-description">Description</label>
              <textarea
                id="archive-description"
                rows={3}
                value={archiveDescription}
                onChange={(e) => setArchiveDescription(e.target.value)}
              />

              <label htmlFor="archive-file">File (image or PDF, max 10 MB)</label>
              <input
                id="archive-file"
                type="file"
                accept="image/*,application/pdf"
                required
                onChange={(e: ChangeEvent<HTMLInputElement>) => setArchiveFile(e.target.files?.[0] ?? null)}
              />

              <button type="submit" className="btn" disabled={!archiveFile}>Add archive item</button>
              {archiveStatus && <p className="helper">{archiveStatus}</p>}
              {archiveUrl && (
                <p>
                  Uploaded:{' '}
                  <a href={archiveUrl} target="_blank" rel="noopener noreferrer">
                    {archiveUrl}
                  </a>
                </p>
              )}
            </form>

            <h3>Edit or delete archive items</h3>
            <div className="admin-list">
              {galleryAssets.map((asset) => (
                <article key={asset.id} className="admin-list-item">
                  <div className="admin-list-meta">
                    <strong>{asset.title}</strong>
                    <span className="muted"> · {asset.collection}/{asset.category}</span>
                  </div>
                  <p className="admin-list-body">{asset.description}</p>
                  {asset.imageUrl ? (
                    <a href={asset.imageUrl} target="_blank" rel="noopener noreferrer">{asset.imageUrl}</a>
                  ) : null}
                  <div className="admin-list-actions">
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => void deleteGalleryAsset(asset.id)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
              {galleryAssets.length === 0 && <p>No gallery assets yet.</p>}
            </div>
          </>
        )}

      </section>
    </main>
  );
}
