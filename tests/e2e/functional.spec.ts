import { test, expect } from '@playwright/test';

const MEMBER_PASSWORD = process.env.MEMBER_PASSWORD || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

const PUBLIC_PAGES = ['/', '/about', '/login', '/donate', '/admin-login', '/privacy', '/terms', '/accessibility'];

const PROTECTED_ROUTES = [
  '/archive', '/bulletin', '/calendar', '/care', '/chat',
  '/community', '/education', '/organizing', '/shop', '/zines',
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
