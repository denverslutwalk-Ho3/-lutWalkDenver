# SlutWalk Denver Community Hub

SlutWalk Denver is a Next.js community website for public organizing information and a private, shared-password member area. It combines public education and policy pages with a protected community bulletin, events, gallery, archive, chat, store, reporting, and optional AI-assisted support.

The application is intended for the SlutWalk Denver community and organizers. It uses role-level shared passwords rather than individual member accounts.

## Project status

This section records the development sequence agreed for the site. It describes the code in this repository, not a live deployment.

| # | Step | Status |
|---|---|---|
| 1 | Understand the existing architecture | Done — documented under [`docs/project-inventory/`](docs/project-inventory/00-index.md) |
| 2 | Improve the Bulletin layout | Done |
| 3 | Add categories for existing discussions | Done — category helper in `lib/forum-categories.ts`, category filter on `/bulletin` |
| 4 | Add persistent individual thread pages | Done — `/bulletin/[id]` |
| 5 | Add pagination and search | Partly done — the gallery API uses `lib/gallery-pagination.ts`; a discussion search helper (`lib/discussion-search.ts`) and the category helper are unit-tested, but the bulletin interface has no search box yet. Wiring search into the bulletin is the next step. |
| 6 | Establish community agreements | Done — `/community-agreement` and the `communityAgreementAcceptances` collection |
| 7 | Build reporting and moderation workflows | Initial implementation done — report reasons and statuses in `lib/reporting.ts`, `/api/reports`, and the admin report queue with audit entries |
| 8 | Evaluate individual member accounts | Deferred until the community requires individual identity and permissions |
| 9 | Complete independent testing and deployment review | In progress — CI exists; no deployment and no independent security review yet |

### Project constraints

- Preserve accessible mobile layouts.
- Preserve compatibility with existing Firestore posts and reply subcollections.
- Keep the shared-member and organizer authentication model.
- Do not add an external search dependency.
- Do not create public member profiles.
- Make surgical changes instead of replacing working systems.

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
| Firebase (Web SDK) | 13.4.0 | Client-side Firebase app initialization and analytics helper in `lib/firebase.ts`; not yet imported by any page or component |
| Vitest | 5.1.0 | Unit and route tests |
| Playwright | 1.65.1 | Browser, route, authentication, responsive, and accessibility tests |
| axe-core through `@axe-core/playwright` | 4.14.0 | Automated accessibility checks |
| JSDOM | 24.1.3 | Browser-like unit-test environment |

Versions above are the locked versions from `package-lock.json`, not only the ranges in `package.json`. Node 22 is pinned by `.nvmrc` and `package.json`'s `engines` field.

The UI uses custom React components and custom CSS in `app/globals.css`. No separate UI component library or CSS framework is installed. A Firebase Web SDK client module (`lib/firebase.ts`) initializes the `we-can-chat-13c4u` web project from its inline config and exposes an analytics helper, but no page or component imports it yet; all functional Firebase access still happens server-side through Firebase Admin. The client module's project ID is separate from the `FIREBASE_PROJECT_ID` environment variable used by the Admin SDK, and aligning them is an open follow-up.

External integrations implemented in the source are Firebase Admin with Cloud Firestore and Firebase Storage, plus a server-to-Mistral HTTP API for `/ai-chat`. Their live availability is not established by this repository alone. `APIFY_API_TOKEN` appears only in `.env.example`; no application code reads it.

## Application features

### Public pages

- Landing page `/`
- `/about` and `/donate`
- `/privacy`, `/terms`, and `/accessibility` policies
- `/login` member sign-in and `/admin-login` organizer sign-in

### Member community

Signed-in members and organizers can reach:

- **Bulletin** (`/bulletin`): posts, pinned posts, a category filter (announcements, organizing, mutual aid, education, events, community care), replies, reporting a post, and persistent thread pages at `/bulletin/[id]`
- **Community agreement** (`/community-agreement`): acceptance is recorded with role and timestamp
- **Calendar** (`/calendar`): month view, upcoming events, role-level RSVPs, `.ics` download, and a Google Calendar link
- **Community gallery** (`/community`): shared gallery of member-visible images
- **Archive** (`/archive`): uploaded archive items plus bundled historical media served by an authenticated route
- **Chat** (`/chat`): a shared room encrypted in the browser (see the privacy limitation below)
- **AI chat** (`/ai-chat`): optional assistant that needs `MISTRAL_API_KEY`
- **Care** (`/care`): organizing, education, and care resources; the former `/organizing` and `/education` URLs redirect here
- **Shop** (`/shop`): product listings, with zine copies and submissions coordinated by organizers

### Administrator dashboard

The `/admin` route provides organizer controls for:

- Community statistics
- Content moderation controls and the restricted report queue
- Bulletin posts and replies
- Events and event archiving
- Products and product images
- Community and archive gallery uploads
- AI assistant agent prompts

### Current route layout

Public routes include `/`, `/about`, `/donate`, `/privacy`, `/terms`, `/accessibility`, `/login`, and `/admin-login`.

Routes requiring a member or organizer session include `/bulletin`, `/bulletin/[id]`, `/calendar`, `/community`, `/community-agreement`, `/archive`, `/chat`, `/ai-chat`, `/care`, and `/shop`.

`/admin` is administrator-only. `next.config.mjs` also redirects `/events` to `/calendar`, `/shop/success` to `/donate`, `/organizing` and `/education` to `/care`, `/zines` to `/shop`, `/chatroom-spec` to `/chat`, and legacy `.html` URLs to their App Router equivalents.

## Architecture

This is a server-rendered Next.js App Router application rather than a static-export site.

- `app/` contains layouts, pages, shared components, and API route handlers.
- `app/components/` contains the shared header, footer, and password form.
- `app/api/` contains same-origin backend endpoints.
- `middleware.ts` runs on the Node.js runtime and checks protected page access before rendering.
- `lib/` contains authentication, session validation, password handling, Firebase, storage, chat, calendar, AI, reporting, and validation helpers.
- Firestore is accessed only through Firebase Admin from server code.
- Firebase Storage files are served through authenticated `/api/storage` URLs or the allowlisted `/api/archive-media/[filename]` route.
- React components call `/api/*` endpoints and update their local state.
- `next.config.mjs` sets response headers: a Content-Security-Policy, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, a restrictive `Permissions-Policy`, and `noindex` headers on member and admin paths.

### Authentication flow

Member and administrator access use separate shared passwords:

1. A visitor opens `/login` or `/admin-login`.
2. `PasswordForm` submits the password to `/api/auth/login` or `/api/auth/admin-login`.
3. The API checks the configured password and the Firestore-backed login rate limit.
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
app/                     Next.js App Router pages, layouts, and API routes
app/components/          Shared header, footer, and password form
app/api/                 Server-side API route handlers
lib/                     Authentication, Firebase, storage, chat, AI, validation, and helper code
lib/*.test.ts            Vitest unit tests kept next to the helpers they cover
middleware.ts            Protected-page access control
assets/community-media/  Archive and zine source media kept outside public/
public/                  Browser-published logos, favicon, manifest, robots, and sitemap
scripts/test-auth.sh     Manual login smoke test against a running server
tests/unit/              Vitest tests for API route handlers
tests/e2e/               Playwright functional, accessibility, and responsive tests
docs/                    Deployment runbook and project inventory
.github/workflows/       GitHub Actions CI
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

`npm ci` installs the exact versions recorded in the committed `package-lock.json`.

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
npm run lint          # ESLint through `next lint`
npx tsc --noEmit      # TypeScript type check
npm test              # Vitest unit tests (lib/ and tests/unit/)
npm run build         # production build
npm run test:e2e      # Playwright: functional, responsive, and accessibility specs
npm run test:a11y     # Playwright accessibility spec only
npm run test:responsive
npm run test:all      # unit tests followed by end-to-end tests
npm start             # serve a completed production build
```

`next lint` prints a deprecation notice on Next.js 15 but still runs.

Playwright builds and starts the application itself unless `SKIP_WEBSERVER` is set, and runs four viewport projects (desktop, mobile, tablet, widescreen). Login tests need test passwords and Firestore configuration to exercise real password and rate-limit flows; the Playwright web server injects its own test values.

A manual login smoke test can be run against an already-running server:

```bash
MEMBER_PASSWORD='your-member-password' ADMIN_PASSWORD='your-admin-password' ./scripts/test-auth.sh http://localhost:3000
```

The script reads the passwords from the environment; never commit them.

## Environment variables

`.env.example` is the reference for local configuration. It contains placeholders only.

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
| `BASE44_PREVIEW_MODE` | Enables the sandbox preview origin override in `next.config.mjs`; unset everywhere else |
| `BASE44_PUBLIC_HOST_SUFFIX` | Supplies the preview origin suffix for that override |

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

RSVP values are keyed by shared role rather than individual identity. Agreement acceptances store role and acceptance metadata, not public member profiles. Report records store the reason and moderation status, and audit entries record moderation changes.

### Stored media behavior

- Post images are uploaded during post creation under a post-specific path (`posts/{postId}/{timestamp}-{filename}`).
- Images in the former shared `posts/` folder are retained when a post is deleted, because the app cannot prove they belong to that post; clean those up separately if needed.
- Product image cleanup only touches stored product paths (`products/...`) and legacy `/api/storage?path=products/...` URLs. Unrelated external image URLs are never deleted.
- Firebase Storage and Firestore do not share a transaction. Product image cleanup runs before the metadata change: if Storage cleanup fails the metadata is left alone, and if the later Firestore write fails the API reports that the old image was already removed and metadata may need manual repair.
- Legacy RSVP arrays are normalized to the role-keyed shape the next time an event receives an RSVP.

## Testing and CI

Vitest unit tests cover authentication helpers, password and session versions, login throttling, AI validation, storage paths and cleanup, calendar exports, forum categories, discussion search, gallery pagination, reporting, and API route authorization.

Playwright tests cover:

- Public and protected route behavior
- Member and administrator session boundaries
- Responsive layouts
- Accessibility with axe-core
- Archive and upload restrictions
- Admin-only actions
- Navigation and focus behavior

The CI workflow in `.github/workflows/ci.yml` installs Node.js 22 and locked dependencies, installs Chromium and WebKit, then runs lint, the TypeScript check, unit tests, a production build, the end-to-end tests (excluding the accessibility spec), and the protected-page accessibility tests. It uses a read-only repository token and a CI-only `AUTH_SECRET` placeholder.

CI verifies the code only. It does not deploy, and passing local or CI checks does not verify live Firebase, Mistral, DNS, TLS, hosting, or production Storage ACL configuration.

## Deployment

The application requires a Node.js/Next.js server runtime (Node.js 22 or newer); it is not configured for static export. There is no `output: 'export'`, no `next export` command, and no static `out/` artifact: middleware and the Node.js API routes need a server.

Hosting is not resolved by this repository:

- **Apify is the intended host.** No Apify deployment configuration exists in this repository. Confirm the Apify service can run this Next.js SSR app — App Router, API routes, Node.js middleware, and Node.js 22 — and can supply server-only secrets at runtime. If it cannot, select a compatible host first.
- **`amplify.yml` and [`docs/deployment-runbook.md`](docs/deployment-runbook.md) describe AWS Amplify**, not Apify. The build spec publishes the `.next` SSR artifact, and the runbook covers Amplify compute, secrets, Firebase, Porkbun DNS, verification, and rollback. No Amplify app, GitHub connection, or deployment is established by the repository.
- `APIFY_API_TOKEN` is a reserved token for a future Apify-backed feature; it is not hosting configuration.

Resolve this mismatch — either add Apify deployment configuration or adopt the Amplify runbook — and verify the chosen host supports the required runtime before connecting production traffic. Porkbun DNS changes must wait until the selected host supplies its exact domain-validation and routing records; do not guess record values or change nameservers.

No production deployment exists today. Nothing in this repository proves the app is deployed, and no custom domain is attached.

## Follow-up tasks

Account-owner and deployment tasks, in order:

1. **Confirm the hosting architecture.** Verify that the intended Apify service can run this Next.js SSR app and provide server-only secrets at runtime, then update the deployment configuration and runbook to match. If it cannot, select a compatible host first.
2. **Provision member and admin sign-in.** Set distinct, strong `MEMBER_PASSWORD` and `ADMIN_PASSWORD` values and a high-entropy `AUTH_SECRET` in the host's server-side secret store; never use `NEXT_PUBLIC_*` variables or expose secrets in preview builds, logs, or downloadable artifacts. Treat any shared password that has been sent through chat, email, or a plaintext document as exposed and replace it before launch. Confirm the shared-password-per-role model is acceptable: it does not identify individual members or admins. Test anonymous redirects, member access without admin access, admin access, logout, session expiration and revocation, role-separated cookies, and login rate limits before launch.
3. **Prepare Firebase.** With the Firebase owner, confirm the production project, Firestore, and Storage are enabled. Provide the server-side Firebase Admin project ID, service-account email and private key, and bucket name with least-privilege IAM access. Configure TTL for `internal_login_rate_limits.expiresAt`, validate trusted proxy address handling, and test required API reads and writes with non-production data. Firebase Admin bypasses client Security Rules, so do not broaden service-account permissions to work around failures.
4. **Review stored media and API behavior.** Inventory existing Storage objects and public access; back up and approve any migration before changing production objects. Verify new uploads remain private and authenticated media routes work for the intended roles. Define an owner-visible recovery procedure for the partial-failure case described under stored media behavior.
5. **Configure optional integrations only when enabled.** Set `MISTRAL_API_KEY` as a server-only secret only if enabling `/ai-chat`; keep the disclosure that submitted text is sent to Mistral in plaintext and is not end-to-end encrypted. `APIFY_API_TOKEN` is unused by the current app; configure it only if an Apify-backed feature is implemented.
6. **Gate production deploys.** Require the CI checks before merging to the production branch. Keep production credentials out of untrusted pull-request previews. Deploy first to the host's default URL and verify Node.js 22, server-side secret access, protected pages, APIs, Firebase, and private media before attaching the custom domain.
7. **Configure Porkbun after the host is verified.** Inspect and save the current DNS zone first. Use only the exact domain-validation and routing records supplied by the selected host; do not guess record values or change nameservers. Preserve MX, mail-related TXT, and unrelated verification records. Verify DNS, TLS, HTTPS redirects, and apex/`www` canonical behavior after propagation.
8. **Record go-live and rollback checks.** Confirm member and admin access boundaries, protected API behavior, Firebase operations, media privacy, domain routing, and the absence of secrets in browser bundles and logs. Document the last-known-good deployment and rollback steps before announcing the site.

## Contributing and maintenance

1. Preserve the shared-password, role-separated authentication model unless requirements and security review explicitly change it.
2. Keep API authorization server-side; do not rely only on middleware or hidden UI controls.
3. Preserve existing Firestore fields and subcollections for compatibility.
4. Do not make storage objects public or expose private member media.
5. Keep validation at API boundaries.
6. Run lint, type checking, unit tests, and the relevant build or browser tests. Report which checks actually ran; a check that could not run is not a passing check.
7. Treat hosting and production secrets as deployment configuration, not application changes.

For route or feature changes, update the relevant API tests and browser coverage rather than weakening existing checks. Keep this README, `AGENTS.md`, and the deployment runbook consistent with the behavior you change.

## Documentation

- [`docs/deployment-runbook.md`](docs/deployment-runbook.md) — AWS Amplify deployment preparation, secret handling, Firebase readiness, Porkbun DNS, verification, and rollback
- [`docs/project-inventory/00-index.md`](docs/project-inventory/00-index.md) — full project inventory: overview, file and folder inventory, feature inventory, route and API reference, data flow, auth and security, dependency reference, architecture diagrams, maintenance register, and a beginner guide
- [`AGENTS.md`](AGENTS.md) — operating standard and verification commands for anyone changing the repository
- [`LICENSE.txt`](LICENSE.txt) — license and terms of use

## Security notes

- Session cookies are HttpOnly and signed with `AUTH_SECRET`; the `Secure` flag is set in production.
- Password verification is constant-time.
- Password rotation revokes prior sessions through password-version claims.
- Member and admin cookies and roles are kept separate.
- Protected APIs repeat session authorization.
- Login rate limiting is backed by Firestore (10 attempts per address and role in a 15-minute window) and fails closed if unavailable.
- Admin-only operations require the admin role.
- Uploaded files are type-, size-, folder-, and role-validated.
- Private media retrieval requires a signed-in session.

These controls have been implemented and partly tested locally. They are not evidence of a live production security audit.
