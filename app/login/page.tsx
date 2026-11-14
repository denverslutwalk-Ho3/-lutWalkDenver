'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import PasswordForm from '../components/PasswordForm';

type Role = 'member' | 'admin' | null;

function safeNextPath() {
  if (typeof window === 'undefined') return '/community';
  const next = new URLSearchParams(window.location.search).get('next');
  // Only allow internal paths, so ?next= cannot be used as an open redirect.
  if (next && next.startsWith('/') && !next.startsWith('//')) return next;
  return '/community';
}

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/session', { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { role?: Role; memberLoginConfigured?: boolean } | null) => {
        if (!active) return;
        setRole(data?.role ?? null);
        setConfigured(data?.memberLoginConfigured ?? false);
      })
      .catch(() => {
        if (active) setConfigured(false);
      });
    return () => { active = false; };
  }, []);

  const signOut = async () => {
    await Promise.allSettled([
      fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }),
      fetch('/api/auth/admin-logout', { method: 'POST', credentials: 'include' }),
    ]);
    setRole(null);
  };

  return (
    <main className="shell">
      <section className="login-card" aria-labelledby="login-title">
        <p className="eyebrow">Member access</p>
        <h1 id="login-title">Sign in to the community hub</h1>
        <p>
          Member pages are protected by one shared password. Ask an organizer if you
          do not have it.
        </p>

        {role ? (
          <div className="signed-in">
            <p>
              You are signed in as {role === 'admin' ? 'an administrator' : 'a member'}.
            </p>
            <div className="btn-row">
              <Link className="btn" href="/community">Go to the community hub</Link>
              <button className="btn btn-secondary" type="button" onClick={() => void signOut()}>
                Sign out
              </button>
            </div>
          </div>
        ) : configured === false ? (
          <p className="notice notice--warning">
            Member sign-in is not set up yet. An organizer needs to set the member
            password on the server.
          </p>
        ) : configured ? (
          <PasswordForm
            endpoint="/api/auth/login"
            fieldLabel="Member password"
            submitLabel="Sign in"
            onSuccess={() => {
              router.replace(safeNextPath());
              router.refresh();
            }}
          />
        ) : (
          <p className="helper">Checking sign-in status…</p>
        )}

        <p className="helper">
          Organizers sign in on the <Link href="/admin-login">administrator page</Link>.
        </p>
      </section>
    </main>
  );
}
