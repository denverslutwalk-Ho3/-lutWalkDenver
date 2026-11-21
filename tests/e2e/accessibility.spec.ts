import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createSessionToken } from './auth-test-helpers';

const PUBLIC_PAGES = [
  { name: 'landing', url: '/' },
  { name: 'about', url: '/about' },
  { name: 'login', url: '/login' },
  { name: 'donate', url: '/donate' },
  { name: 'admin-login', url: '/admin-login' },
  { name: 'privacy', url: '/privacy' },
];

const PROTECTED_PAGES = [
  { name: 'care', url: '/care' },
  { name: 'shop', url: '/shop' },
  { name: 'bulletin', url: '/bulletin' },
  { name: 'chat', url: '/chat' },
  { name: 'calendar', url: '/calendar' },
  { name: 'community', url: '/community' },
  { name: 'community-agreement', url: '/community-agreement' },
  { name: 'archive', url: '/archive' },
];

async function mockProtectedPageApis(page: import('@playwright/test').Page) {
  await page.route('**/api/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.startsWith('/api/archive-media/')) {
      await route.continue();
      return;
    }

    let response: Record<string, unknown> = {};
    if (pathname === '/api/auth/session') response = { role: 'member' };
    else if (pathname === '/api/posts') response = { posts: [] };
    else if (pathname.startsWith('/api/posts/')) response = { replies: [] };
    else if (pathname === '/api/events') response = { events: [] };
    else if (pathname === '/api/products') response = { products: [] };
    else if (pathname === '/api/gallery') response = { assets: [] };
    else if (pathname === '/api/messages/key') {
      response = { key: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' };
    } else if (pathname === '/api/messages') response = { messages: [] };

    await route.fulfill({ status: 200, json: response });
  });
}

test.describe('Accessibility — axe-core WCAG AA', () => {
  for (const page of PUBLIC_PAGES) {
    test(`${page.name} — 0 axe violations`, async ({ page: browserPage }) => {
      await browserPage.goto(page.url);
      const results = await new AxeBuilder({ page: browserPage })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(results.violations,
        `Violations on ${page.name}:\n${JSON.stringify(results.violations, null, 2)}`
      ).toHaveLength(0);
    });
  }

  for (const page of PROTECTED_PAGES) {
    test(`${page.name} — 0 axe violations (authenticated)`, async ({ page: browserPage }) => {
      await mockProtectedPageApis(browserPage);
      await browserPage.context().addCookies([{
        name: 'sw_auth',
        value: createSessionToken('member'),
        url: process.env.BASE_URL || 'http://localhost:3000',
        httpOnly: true,
        sameSite: 'Lax',
      }]);
      await browserPage.goto(page.url);
      const results = await new AxeBuilder({ page: browserPage })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(results.violations,
        `Violations on ${page.name}:\n${JSON.stringify(results.violations, null, 2)}`
      ).toHaveLength(0);
    });
  }
});
