import { test, expect } from '@playwright/test';
import { createSessionToken } from './auth-test-helpers';

const MEMBER_PASSWORD = process.env.MEMBER_PASSWORD || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

const PUBLIC_PAGES = ['/', '/about', '/login', '/donate', '/admin-login', '/privacy', '/terms', '/accessibility'];

const PROTECTED_ROUTES = [
  '/archive', '/bulletin', '/bulletin/example-thread', '/calendar', '/care', '/chat',
  '/community', '/community-agreement', '/shop',
];

test.describe('Public pages load', () => {
  for (const path of PUBLIC_PAGES) {
    test(`${path} returns 200`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
    });
  }
});

test.describe('Protected routes redirect unauthenticated users', () => {
  for (const path of PROTECTED_ROUTES) {
    test(`${path} redirects to sign in`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login\?next=/);
    });
  }
});

test.describe('Legacy routes redirect', () => {
  test('/events goes to the calendar (then sign in)', async ({ page }) => {
    await page.goto('/events');
    await expect(page).toHaveURL(/\/login\?next=%2Fcalendar/);
  });

  test('/index.html goes home', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('Auth flow — member login', () => {
  test.beforeEach(async () => {
    test.skip(!MEMBER_PASSWORD, 'MEMBER_PASSWORD not set');
  });

  test('member can sign in and reach a protected page', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input#access-password').fill(MEMBER_PASSWORD.trim());
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/community$/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('member login fails with wrong password', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input#access-password').fill('definitely-wrong-password-12345');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.locator('.form-message--error')).toContainText(/incorrect|not work/i);
  });
});

test.describe('Auth flow — admin login', () => {
  test.beforeEach(async () => {
    test.skip(!ADMIN_PASSWORD, 'ADMIN_PASSWORD not set');
  });

  test('admin can sign in and open the dashboard', async ({ page }) => {
    await page.goto('/admin-login');
    await page.locator('input#access-password').fill(ADMIN_PASSWORD.trim());
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/admin$/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /Manage the community hub/i })).toBeVisible();
  });
});

test.describe('API access control', () => {
  test('unauthenticated API reads are rejected', async ({ request }) => {
    for (const path of ['/api/posts', '/api/events', '/api/products', '/api/messages', '/api/gallery']) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(401);
    }
  });

  test('unauthenticated writes are rejected', async ({ request }) => {
    const response = await request.post('/api/posts', { data: { title: 'x', text: 'y' } });
    expect(response.status()).toBe(401);
  });

  test('POST /api/auth/login rejects a wrong password', async ({ request }) => {
    const response = await request.post('/api/auth/login', { data: { password: 'wrong-password' } });
    expect([401, 503]).toContain(response.status());
  });

  test('archive media reads require a session', async ({ request }) => {
    const response = await request.get('/api/archive-media/slutwalk-2021-1.jpg');
    expect(response.status()).toBe(401);
  });

  test('archive images are not exposed as public static files', async ({ request }) => {
    const response = await request.get('/media/archive/slutwalk-2021-1.jpg');
    expect(response.status()).toBe(404);
  });
});

test.describe('Session role and revocation checks', () => {
  test('member session cannot enter the admin dashboard', async ({ page }) => {
    await page.goto('/');
    await page.context().addCookies([{
      name: 'sw_auth',
      value: createSessionToken('member'),
      url: new URL(page.url()).origin,
      httpOnly: true,
      sameSite: 'Lax',
    }]);

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin-login\?next=%2Fadmin/);
  });

  test('admin session can enter the admin dashboard', async ({ page }) => {
    await page.goto('/');
    await page.context().addCookies([{
      name: 'sw_admin',
      value: createSessionToken('admin'),
      url: new URL(page.url()).origin,
      httpOnly: true,
      sameSite: 'Lax',
    }]);

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { name: /Manage the community hub/i })).toBeVisible();
  });

  test('member cannot choose a post image path or URL', async ({ page }) => {
    await page.goto('/');
    await page.context().addCookies([{
      name: 'sw_auth',
      value: createSessionToken('member'),
      url: new URL(page.url()).origin,
      httpOnly: true,
      sameSite: 'Lax',
    }]);

    for (const imageFields of [
      { storagePath: 'products/1700000000000-unrelated.png' },
      { imageUrl: '/api/storage?path=posts/another-post/1700000000000-image.png' },
    ]) {
      const response = await page.request.post('/api/posts', {
        data: { title: 'Test post', text: 'Test body', ...imageFields },
      });
      expect(response.status()).toBe(400);
    }
  });

  test('old member sessions are rejected after password rotation', async ({ page }) => {
    await page.goto('/');
    await page.context().addCookies([{
      name: 'sw_auth',
      value: createSessionToken('member', 'previous-member-password'),
      url: new URL(page.url()).origin,
      httpOnly: true,
      sameSite: 'Lax',
    }]);

    await page.goto('/bulletin');
    await expect(page).toHaveURL(/\/login\?next=%2Fbulletin/);
  });

  test('archive PDFs are offered as downloads instead of rendered as images', async ({ page }) => {
    await page.route('**/api/gallery**', (route) => route.fulfill({
      json: {
        assets: [{
          id: 'pdf-1',
          title: 'Workshop zine',
          category: 'zines',
          contentType: 'application/pdf',
          storagePath: 'archive/zines/workshop.pdf',
          imageUrl: '/api/storage?path=archive%2Fzines%2Fworkshop.pdf',
        }],
      },
    }));
    await page.goto('/');
    await page.context().addCookies([{
      name: 'sw_auth',
      value: createSessionToken('member'),
      url: new URL(page.url()).origin,
      httpOnly: true,
      sameSite: 'Lax',
    }]);

    await page.goto('/archive');
    await expect(page.getByRole('link', { name: 'Download PDF: Workshop zine' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Workshop zine' })).toHaveCount(0);
  });

  test('calendar dialog traps focus, closes with Escape, and restores focus', async ({ page }) => {
    const eventDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await page.route('**/api/events**', (route) => route.fulfill({
      json: {
        events: [{
          id: 'meeting-1',
          title: 'Community workshop',
          date: eventDate,
          time: '5:00 PM',
          location: 'Denver',
          description: 'Bring ideas',
        }],
      },
    }));
    await page.goto('/');
    await page.context().addCookies([{
      name: 'sw_auth',
      value: createSessionToken('member'),
      url: new URL(page.url()).origin,
      httpOnly: true,
      sameSite: 'Lax',
    }]);
    await page.goto('/calendar');

    const trigger = page.getByRole('heading', { name: 'Community workshop' })
      .getByRole('button', { name: 'Community workshop' });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Community workshop' });
    const closeButton = dialog.getByRole('button', { name: 'Close event details' });
    await expect(closeButton).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('link', { name: 'Google Calendar' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('product dialog closes with Escape and restores focus', async ({ page }) => {
    await page.route('**/api/products**', (route) => route.fulfill({
      json: {
        products: [{
          id: 'shirt-1',
          name: 'Community shirt',
          description: 'A cotton shirt',
          price: 2000,
          imageUrl: '',
          category: 'apparel',
          stock: 5,
        }],
      },
    }));
    await page.goto('/');
    await page.context().addCookies([{
      name: 'sw_auth',
      value: createSessionToken('member'),
      url: new URL(page.url()).origin,
      httpOnly: true,
      sameSite: 'Lax',
    }]);
    await page.goto('/shop');

    const trigger = page.getByRole('button', { name: 'Community shirt' });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Community shirt' });
    const closeButton = dialog.getByRole('button', { name: 'Close product details' });
    await expect(closeButton).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(closeButton).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('archive media is served only to signed-in members', async ({ page }) => {
    await page.goto('/');
    await page.context().addCookies([{
      name: 'sw_auth',
      value: createSessionToken('member'),
      url: new URL(page.url()).origin,
      httpOnly: true,
      sameSite: 'Lax',
    }]);
    const authorizedResponse = await page.request.get('/api/archive-media/slutwalk-2021-1.jpg');
    expect(authorizedResponse.status()).toBe(200);
    expect(authorizedResponse.headers()['content-type']).toBe('image/jpeg');
    expect(authorizedResponse.headers()['cache-control']).toBe('private, no-store');
  });

  test('event Edit opens the form and saves changes', async ({ page }) => {
    let updatedEvent: Record<string, unknown> | undefined;
    await page.route('**/api/posts**', (route) => route.fulfill({ json: { posts: [] } }));
    await page.route('**/api/products**', (route) => route.fulfill({ json: { products: [] } }));
    await page.route('**/api/gallery**', (route) => route.fulfill({ json: { assets: [] } }));
    await page.route('**/api/events**', async (route) => {
      if (route.request().method() === 'PATCH') {
        updatedEvent = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill({ json: { ok: true } });
        return;
      }
      await route.fulfill({
        json: {
          events: [{
            id: 'meeting-1',
            title: 'Community meeting',
            date: '2026-11-20',
            time: '5:00 PM',
            location: 'Library',
            description: 'Monthly check-in',
          }],
        },
      });
    });

    await page.goto('/');
    await page.context().addCookies([{
      name: 'sw_admin',
      value: createSessionToken('admin'),
      url: new URL(page.url()).origin,
      httpOnly: true,
      sameSite: 'Lax',
    }]);
    await page.goto('/admin');
    await page.getByRole('button', { name: 'Events', exact: true }).click();
    await page.getByRole('button', { name: 'Edit Community meeting' }).click();
    await expect(page.getByRole('heading', { name: 'Edit event' })).toBeVisible();
    await page.locator('#evt-title').fill('Updated meeting');
    await page.locator('#evt-date').fill('2026-11-21');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Event updated')).toBeVisible();
    expect(updatedEvent).toMatchObject({
      title: 'Updated meeting',
      date: '2026-11-21',
    });
  });
});

test.describe('No dead internal links on public pages', () => {
  for (const path of ['/', '/about', '/donate']) {
    test(`links resolve on ${path}`, async ({ page }) => {
      await page.goto(path);
      const links = await page.locator('a[href^="/"]').evaluateAll((nodes) =>
        Array.from(new Set(nodes.map((node) => node.getAttribute('href')))).filter(Boolean),
      );
      for (const href of links) {
        const response = await page.request.get(href as string);
        expect([200, 307, 308], `${path} -> ${href}`).toContain(response.status());
      }
    });
  }
});

test.describe('Mobile navigation', () => {
  test('menu button opens the primary navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const menuButton = page.getByRole('button', { name: 'Menu' });
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    await expect(page.locator('#primary-navigation')).toBeVisible();
    await expect(page.getByRole('link', { name: 'About', exact: true })).toBeVisible();
  });
});

test.describe('Contact details', () => {
  test('footer shows the current contact email', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.footer')).toContainText('denverslutwalk@proton.me');
    await expect(page.locator('.footer')).not.toContainText('hello@slutwalkdenver.gay');
  });
});

test.describe('Static assets', () => {
  test('sitemap.xml loads', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
  });

  test('robots.txt loads', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
  });
});
