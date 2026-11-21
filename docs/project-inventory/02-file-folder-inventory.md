# File and Folder Inventory

## Root files

| File or folder | Purpose | Connects to | Essential? | Classification | Status |
|---|---|---|---|---|---|
| `package.json` | npm scripts and direct dependencies | all Node tooling | Yes | Configuration | Implemented |
| `package-lock.json` | Exact dependency resolution | npm CI/install | Yes | Configuration | Synced after lockfile restoration |
| `tsconfig.json` | TypeScript compiler configuration | all TypeScript | Yes | Configuration | Active |
| `vitest.config.ts` | Unit-test environment and discovery | `lib/*.test.ts`, `tests/unit/**` | Yes | Testing | Active |
| `playwright.config.ts` | Browser, viewport, server, and test configuration | `tests/e2e/**` | Yes | Testing | Active |
| `middleware.ts` | Member/admin page protection | `lib/auth-edge.ts`, session-version helpers | Yes | Auth/security | Active |
| `next.config.mjs` | Redirects, CSP, security headers, image access, archive trace | pages and API routes | Yes | Configuration | Active |
| `.env.example` | Placeholder environment-variable documentation | server configuration | Yes | Documentation/configuration | Placeholders only |
| `.github/workflows/ci.yml` | lint, types, unit tests, build, Playwright, and accessibility | package scripts | Yes | Deployment/CI | Configured |
| `amplify.yml` | AWS Amplify build phase and artifact definition | Next.js build | Conditional | Deployment | Configured, live hosting unverified |
| `docs/` | Deployment runbook and this inventory | project operations | Yes | Documentation | Active |
| `assets/community-media/` | Community archive and zine source files kept outside `public/` | `/api/archive-media`, build tracing | Content | Preserve | Source-archive media |
| `public/` | Browser-published favicon, logo, manifest, robots, sitemap, CNAME | layout and public routes | Yes | Assets/content | Active |
| `scripts/test-auth.sh` | Manual curl-based auth smoke check | login APIs | Optional | Development tool | Unverified by live credentials |

## Application pages

| Path | Purpose | Essential? | Status |
|---|---|---|---|
| `app/page.tsx` | Public landing page | Yes | Active |
| `app/about/page.tsx` | Public organization information | Yes | Active |
| `app/donate/page.tsx` | Giving and partner links | Yes | Active |
| `app/privacy/page.tsx`, `terms/page.tsx`, `accessibility/page.tsx` | Public policy pages | Yes | Active |
| `app/login/page.tsx`, `app/admin-login/page.tsx` | Role sign-in pages | Yes | Active |
| `app/admin/page.tsx` | Organizer dashboard | Yes | Core UI; large and feature-dense |
| `app/bulletin/page.tsx` | Bulletin list, categories, posting, replies, reports | Yes | Active |
| `app/bulletin/[id]/page.tsx` | Individual persistent discussion | Yes | Active; pre-existing untracked work |
| `app/calendar/page.tsx` | Member events and RSVP | Yes | Active |
| `app/chat/page.tsx` | Browser-encrypted shared chat UI | Yes | Active |
| `app/ai-chat/page.tsx` | Member AI assistant UI | Yes | Optional service |
| `app/community/page.tsx` | Community gallery | Yes | Active |
| `app/archive/page.tsx` | Static and uploaded archive | Yes | Active |
| `app/shop/page.tsx` | Product catalog and zine resources | Yes | Active |
| `app/care/page.tsx` | Consolidated care, organizing, and education resources | Yes | Active; some historical content was omitted during consolidation |
| `app/community-agreement/page.tsx` | Community agreement acceptance | Yes | Active |

Deleted consolidated routes:

| Former file | Current status |
|---|---|
| `app/education/page.tsx` | Deleted; `/education` permanently redirects to `/care` |
| `app/organizing/page.tsx` | Deleted; `/organizing` permanently redirects to `/care` |
| `app/zines/page.tsx` | Deleted; `/zines` permanently redirects to `/shop` |
| `next.config.source.mjs` | Deleted zero-byte, unreferenced file |

## Shared application code

| File or folder | Purpose | Essential? | Classification |
|---|---|---|---|
| `app/layout.tsx` | Root metadata, header, footer, skip link | Yes | Core layout |
| `app/components/SiteHeader.tsx` | Navigation and session-aware sign-out | Yes | Shared UI |
| `app/components/Footer.tsx` | Shared footer and links | Yes | Shared UI |
| `app/components/PasswordForm.tsx` | Shared member/admin password form behavior | Yes | Shared UI |
| `app/globals.css` | Shared design tokens and all application styles | Yes | Core styling |
| `app/error.tsx` | Route error UI | Yes | Core UI |
| `app/not-found.tsx` | Missing-route UI | Yes | Core UI |

## Library code

`lib/` contains focused server/client helpers:

- Authentication: `auth.ts`, `auth-edge.ts`, `authz.ts`, `passwords.ts`
- Session rotation: `session-version.ts`, `session-version-edge.ts`
- Login throttling: `login-rate-limit.ts`
- Firebase: `firebase-admin.ts`
- Chat: `chat-crypto.ts`, `chat-key.ts`
- AI: `ai-chat.ts`, `ai-agents.ts`
- Bulletin/search/categories: `discussion-search.ts`, `forum-categories.ts`
- Calendar: `calendar-ics.ts`, `site-date.ts`
- Storage: `bounded-body.ts`, `post-storage.ts`, `product-storage.ts`, `storage-cleanup.ts`, `upload-constraints.ts`
- Gallery/reporting: `gallery-assets.ts`, `gallery-pagination.ts`, `reporting.ts`
- Events: `event-rsvps.ts`
- Shared UI: `use-dialog-focus.ts`

Most helpers have matching unit tests. Their code is active rather than generated demo code.

## Tests

| Area | Files | Purpose |
|---|---|---|
| `lib/*.test.ts` | 17 unit test files | Auth, chat crypto, categories, search, storage, calendar, sessions, AI, and validation |
| `tests/unit/**` | 9 route test files | API authorization and route behavior |
| `tests/e2e/functional.spec.ts` | Route, auth, links, dialogs, upload restrictions | Browser functional checks |
| `tests/e2e/accessibility.spec.ts` | WCAG AA axe checks | Protected and public pages |
| `tests/e2e/responsive.spec.ts` | Viewports, overflow, tap targets, screenshots | Mobile layout coverage |

## Generated or dependency directories

`node_modules/` and `.next/` are generated dependency/build directories. They are not source code and must not be treated as authored application files.
