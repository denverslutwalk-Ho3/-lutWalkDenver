'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import PasswordForm from '../components/PasswordForm';

type Role = 'member' | 'admin' | null;

function nextAdminPath() {
  if (typeof window === 'undefined') return '/admin';
  const next = new URLSearchParams(window.location.search).get('next');
  if (next && next.startsWith('/admin') && !next.startsWith('//')) return next;
  return '/admin';
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/auth/session', { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { role?: Role; adminLoginConfigured?: boolean } | null) => {
        if (!active) return;
        setRole(data?.role ?? null);
        setConfigured(data?.adminLoginConfigured ?? false);
      })
      .catch(() => {
        if (active) setConfigured(false);
      });
    return () => { active = false; };
  }, []);

  const signOut = async () => {
    setLogoutPending(true);
    setLogoutError('');

    const results = await Promise.allSettled([
      fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }),
      fetch('/api/auth/admin-logout', { method: 'POST', credentials: 'include' }),
    ]);

    const failed = results.some(
      (result) => result.status === 'rejected' || !result.value.ok,
    );

    if (failed) {
      setLogoutError('Could not confirm that both sessions were signed out. Please try again.');
      try {
        const response = await fetch('/api/auth/session', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json() as { role?: Role };
          setRole(data.role ?? null);
        }
      } catch {
        setLogoutError('Could not confirm sign-out. Refresh the page and check your session.');
      } finally {
        setLogoutPending(false);
      }
      return;
    }

    setRole(null);
    setLogoutPending(false);
    router.refresh();
  };

  return (
    <main className="shell">
      <section className="login-card" aria-labelledby="admin-login-title">
        <p className="eyebrow">Administrator access</p>
        <h1 id="admin-login-title">Organizer sign in</h1>
        <p>
          Administrators can moderate the bulletin, manage events and the store, and
          upload archive material. This is a separate session from member access.
        </p>

        {logoutError && <p className="notice notice--warning" role="alert">{logoutError}</p>}

        {role === 'admin' ? (
          <div className="signed-in">
            <p>You are signed in as an administrator.</p>
            <div className="btn-row">
              <Link className="btn" href="/admin">Open the admin dashboard</Link>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => void signOut()}
                disabled={logoutPending}
                aria-busy={logoutPending}
              >
                {logoutPending ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </div>
        ) : configured === false ? (
          <p className="notice notice--warning">
            Administrator sign-in is not set up yet. The admin password needs to be
            set on the server.
          </p>
        ) : configured ? (
          <PasswordForm
            endpoint="/api/auth/admin-login"
            fieldLabel="Administrator password"
            submitLabel="Sign in"
            onSuccess={() => {
              router.replace(nextAdminPath());
              router.refresh();
            }}
          />
        ) : (
          <p className="helper">Checking sign-in status…</p>
        )}

        {role === 'member' && (
          <p className="notice">
            You are currently signed in as a member. Signing in here replaces that
            session with an administrator session.
          </p>
        )}

        <p className="helper">
          Looking for member access? <Link href="/login">Go to member sign in</Link>.
        </p>
      </section>
    </main>
  );
}
