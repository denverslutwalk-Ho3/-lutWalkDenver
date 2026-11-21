# SlutWalk Denver Community Hub

SlutWalk Denver is a Next.js community website for public organizing information and a private, shared-password member area. It combines public education and policy pages with a protected community bulletin, events, gallery, archive, chat, store, reporting, and optional AI-assisted support.

The application is intended for the SlutWalk Denver community and organizers. It uses role-level shared passwords rather than individual member accounts.

## Technology stack

The checked-in application currently uses:

| Technology | Version in the lockfile | Purpose |
|---|---:|---|
| Next.js | 15.5.29 | App Router pages, layouts, API routes, middleware, redirects, headers, and production builds |
| React | 19.2.8 | Browser components and interactive UI |
| React DOM | 19.2.8 | React rendering integration used by Next.js |
| TypeScript | 5.9.3 | Strict application and test typing |
| Node.js | 22 or newer | Required server/runtime version |
| npm | Lockfile v3 | Dependency installation and project scripts |
| Firebase Admin | 14.5.1 | Server-side Firebase initialization, Firestore, and Storage access |
| Vitest | 5.1.0 | Unit and route tests |
| Playwright | 1.65.1 | Browser, route, authentication, responsive, and accessibility tests |
| axe-core through `@axe-core/playwright` | 4.14.0 | Automated accessibility checks |
| JSDOM | 24.1.3 | Browser-like unit-test environment |

The UI uses custom React components and custom CSS in `app/globals.css`. No separate UI component library or CSS framework is installed.

External integrations implemented in the source include Firebase Admin with Cloud Firestore and Firebase Storage, plus a server-to-Mistral HTTP API for `/ai-chat`. Their live availability is not established by this repository alone.

## Application features

### Public pages

- Landing page
- About and donation pages
- Privacy, terms, and accessibility policies
- Member sign-in
- Organizer sign-in

### Member community

- Bulletin posts, categories, searches, pinned posts, replies, and reports
- Persistent individual discussion pages
- Shared encrypted-in-browser chat
- Community calendar and role-level RSVPs
- Shared gallery
- Protected archive with uploaded and bundled historical media
- Community-agreement acceptance record
- Zine and product information
- Optional AI chat assistants

### Administrator dashboard

The `/admin` route provides organizer controls for:

- Bulletin posts and replies
- Reports and moderation status
- Events and event archiving
- Products and product images
- Community/archive gallery assets
- Archive uploads
- Named AI assistant prompts

### Current route layout

Public routes include `/`, `/about`, `/donate`, `/privacy`, `/terms`, `/accessibility`, `/login`, and `/admin-login`.

Protected member/admin routes include `/care`, `/archive`, `/bulletin`, `/bulletin/[id]`, `/calendar`, `/chat`, `/ai-chat`, `/community`, `/community-agreement`, and `/shop`.

`/admin` is administrator-only. `/education` and `/organizing` redirect to `/care`; `/zines` redirects to `/shop`; `/events` redirects to `/calendar`; and `/shop/success` redirects to `/donate`.

## Architecture

This is a server-rendered Next.js App Router application rather than a static-export site.

- `app/` contains layouts, pages, shared components, and API route handlers.
- `app/components/` contains the shared header, footer, and password form.
- `app/api/` contains same-origin backend endpoints.
- `middleware.ts` checks protected page access before rendering.
- `lib/` contains authentication, session validation, password handling, Firebase, storage, chat, calendar, AI, reporting, and validation helpers.
- Firestore is accessed only through Firebase Admin from server code.
- Firebase Storage files are served through authenticated `/api/storage` URLs or the allowlisted `/api/archive-media/[filename]` route.
- React components call `/api/*` endpoints and update their local state.

### Authentication flow

Member and administrator access use separate shared passwords:

1. A visitor opens `/login` or `/admin-login`.
2. `PasswordForm` submits the password to `/api/auth/login` or `/api/auth/admin-login`.
3. The API checks the configured password and Firestore-backed login rate limit.
4. A signed session token is issued and stored in an HttpOnly cookie:
   - `sw_auth` for members
   - `sw_admin` for organizers
5. Middleware validates the role and password-version claims for protected pages.
6. API routes repeat authorization checks before reading or changing data.
7. Member and administrator sessions are mutually exclusive.

This is role-level shared-password access, not individual member identity or account management.

Member sessions are currently configured for 30 days and administrator sessions for 8 hours. Password-version claims invalidate sessions after a password or `AUTH_SECRET` rotation.

### Chat privacy limitation

Chat messages use browser-side AES-GCM encryption with a room key derived from `AUTH_SECRET`. Because the server and every signed-in member can derive the key, this is shared-room encryption rather than end-to-end encryption. It should not be treated as confidential end-to-end private messaging.

Mistral chat sends submitted text to Mistral and is not end-to-end encrypted.

### Media privacy limitation

New uploads are intended to remain private and be retrieved through authenticated API routes. Existing Firebase Storage objects may retain public access from earlier configuration. The bucket, object ACLs, and migration status must be reviewed and verified by the Firebase owner.

## Project structure

```text
app/                 Next.js App Router pages, layouts, components, and API routes
app/components/      Shared header, footer, and password form
app/api/             Server-side API endpoints
lib/                 Authentication, Firebase, storage, chat, AI, validation, and helper code
middleware.ts        Protected-page access control
assets/community-media/  Community archive and zine source media kept outside public/
public/              Browser-published logos, favicon, manifest, robots, and sitemap
tests/unit/          Vitest route tests
tests/e2e/           Playwright functional, accessibility, and responsive tests
docs/                Deployment runbook and project inventory
.github/workflows/   GitHub Actions CI
```

Generated `node_modules/` and `.next/` directories are not source files.

## Local development

### Prerequisites

- Node.js 22 or newer
- npm
- Optional Firebase Admin credentials for data and media features
- Optional Mistral API key for `/ai-chat`

### Install

```bash
npm ci
```

### Configure

Copy the placeholder file:

```bash
cp .env.example .env.local
```

Set values locally as documented in `.env.example`. Never commit actual passwords, signing secrets, service-account keys, or API keys.

### Run

```bash
npm run dev
```

The development server uses `http://localhost:3000` by default.

### Available checks

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
npm run test:e2e
npm run test:a11y
npm run test:responsive
npm run test:all
npm start
```

`npm run test:all` runs unit tests followed by Playwright end-to-end tests.

Playwright builds and starts the application itself unless `SKIP_WEBSERVER` is set. Login tests need authorized test passwords and Firestore configuration when exercising real password and rate-limit flows.

## Environment variables

### Application authentication

| Variable | Required | Purpose |
|---|---|---|
| `AUTH_SECRET` | Yes | Signs session tokens and derives the password-version claim and chat room key |
| `MEMBER_PASSWORD` | Yes | Shared password for member access |
| `ADMIN_PASSWORD` | Yes | Shared password for organizer access |

There are deliberately no fallback passwords.

### Firebase Admin

| Variable | Required | Purpose |
|---|---|---|
| `FIREBASE_PROJECT_ID` | For Firestore and Storage | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | For Firestore and Storage | Firebase Admin service-account email |
| `FIREBASE_PRIVATE_KEY` | For Firestore and Storage | Firebase Admin private key; escaped `\n` values are converted in code |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | For uploads | Firebase Storage bucket name; public identifier, read by server code |

Firebase Admin uses server-only credentials and bypasses Firebase client Security Rules.

### Optional integrations

| Variable | Required | Purpose |
|---|---|---|
| `MISTRAL_API_KEY` | For `/ai-chat` | Server-only Mistral API key |
| `MISTRAL_MODEL` | No | Mistral model name; defaults to `mistral-small-latest` |
| `APIFY_API_TOKEN` | No | Reserved server-only token; no current application feature reads it |

### Development and preview variables

| Variable | Purpose |
|---|---|
| `BASE_URL` | Overrides the Playwright test base URL |
| `SKIP_WEBSERVER` | Prevents Playwright from starting its own web server |
| `BASE44_PREVIEW_MODE` | Enables Base44 sandbox preview origins |
| `BASE44_PUBLIC_HOST_SUFFIX` | Supplies the preview origin suffix |

Do not prefix passwords, signing secrets, Firebase private keys, or API keys with `NEXT_PUBLIC_`.

## Firestore data

The application code uses these collections:

- `posts` and `posts/{id}/replies`
- `messages`
- `events`
- `products`
- `galleryAssets`
- `aiAgents`
- `reports` and `reports/{id}/audit`
- `communityAgreementAcceptances`
- `internal_login_rate_limits`

RSVP values are keyed by shared role rather than individual identity. Agreement acceptances store role and acceptance metadata, not public member profiles.

## Testing and CI

Vitest unit tests cover authentication helpers, password/session versions, login throttling, AI validation, storage paths, calendar exports, and API route authorization.

Playwright tests cover:

- Public and protected route behavior
- Member and administrator session boundaries
- Responsive layouts
- Accessibility with axe-core
- Archive and upload restrictions
- Admin-only actions
- Navigation and focus behavior

The CI workflow in `.github/workflows/ci.yml` installs Node.js 22, dependencies, and browser runtimes, then runs lint, TypeScript, unit tests, a production build, E2E tests, and protected-page accessibility tests.

Passing local or CI checks does not verify live Firebase, Mistral, DNS, TLS, hosting, or production Storage ACL configuration.

## Deployment and hosting status

The application requires a Next.js server runtime and is not configured for static export. It uses middleware and Node.js API routes, so a static-only host is insufficient.

`amplify.yml` describes an AWS Amplify build and publishes `.next`, but no live Amplify application or deployment is established by the repository. The README and deployment runbook also identify Apify as an intended host, while no Apify deployment configuration exists. Hosting selection remains unresolved until the account owner verifies the runtime and secret-store approach.

The repository includes deployment documentation in [docs/deployment-runbook.md](docs/deployment-runbook.md). It does not prove a live deployment.

Before production:

1. Choose a compatible Next.js SSR host.
2. Supply server-only secrets through the verified runtime.
3. Configure and test Firebase, Firestore, and Storage access.
4. Review legacy public Storage objects.
5. Configure login rate-limit TTL in Firestore.
6. Verify member/admin access, logout, media privacy, DNS, HTTPS, and rollback.

## Contributing and maintenance

1. Preserve the shared-password, role-separated authentication model unless requirements and security review explicitly change it.
2. Keep API authorization server-side; do not rely only on middleware or hidden UI controls.
3. Preserve existing Firestore fields and subcollections for compatibility.
4. Do not make storage objects public or expose private member media.
5. Keep validation at API boundaries.
6. Run lint, type checking, unit tests, and the relevant build/browser tests.
7. Treat hosting and production secrets as deployment configuration, not application changes.

For route or feature changes, update the relevant API tests and browser coverage rather than weakening existing checks.

## Security notes

- Session cookies are HttpOnly and signed with `AUTH_SECRET`.
- Password verification is constant-time.
- Password rotation revokes prior sessions through password-version claims.
- Member and admin cookies and roles are kept separate.
- Protected APIs repeat session authorization.
- Login rate limiting is backed by Firestore and fails closed if unavailable.
- Admin-only operations require the admin role.
- Uploaded files are type-, size-, folder-, and role-validated.
- Private media retrieval requires a signed-in session.

These controls have been implemented and partly tested locally. They are not evidence of a live production security audit.
