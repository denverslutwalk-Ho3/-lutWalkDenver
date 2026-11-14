'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const NAV_ITEMS = [
  { href: '/about', label: 'About' },
  { href: '/organizing', label: 'Organizing' },
  { href: '/education', label: 'Education' },
  { href: '/care', label: 'Care' },
  { href: '/community', label: 'Gallery' },
  { href: '/bulletin', label: 'Bulletin' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/chat', label: 'Chat' },
  { href: '/zines', label: 'Zines' },
  { href: '/shop', label: 'Store' },
  { href: '/donate', label: 'Donate' },
];

type Role = 'member' | 'admin' | null;

export default function SiteHeader() {
  const [role, setRole] = useState<Role>(null);
  const [loaded, setLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;

    fetch('/api/auth/session', { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { role?: Role } | null) => {
        if (!active) return;
        setRole(data?.role ?? null);
        setLoaded(true);
      })
      .catch(() => {
        if (active) setLoaded(true);
      });

    return () => { active = false; };
  }, []);

  const signOut = async () => {
    await Promise.allSettled([
      fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }),
      fetch('/api/auth/admin-logout', { method: 'POST', credentials: 'include' }),
    ]);
    window.location.assign('/');
  };

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="logo" href="/" aria-label="$lutWalk Denver home">
          $lutWalk Denver
        </Link>

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? 'Close menu' : 'Menu'}
        </button>

        <nav
          id="primary-navigation"
          aria-label="Primary"
          className={`site-nav${menuOpen ? ' site-nav--open' : ''}`}
        >
          <ul>
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} onClick={() => setMenuOpen(false)}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="site-header__account">
          {!loaded ? null : role ? (
            <>
              {role === 'admin' && (
                <Link className="account-link" href="/admin">Admin dashboard</Link>
              )}
              <button type="button" className="account-button" onClick={() => void signOut()}>
                Sign out
              </button>
            </>
          ) : (
            <Link className="account-link" href="/login">Member sign in</Link>
          )}
        </div>
      </div>
    </header>
  );
}
