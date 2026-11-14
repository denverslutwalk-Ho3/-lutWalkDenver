# SlutWalk Denver community hub

A Next.js App Router site for SlutWalk Denver: public information pages, a shared-password member area, and a separate organizer dashboard.

## Run it

```bash
npm ci
npm run dev        # http://localhost:3000
npm run build      # production build
npm run start      # run the production build
```

Copy `.env.example` to `.env.local` and set the required values before signing in:

| Variable | Required | Purpose |
| --- | --- | --- |
| `AUTH_SECRET` | yes | Signs member and admin session cookies. Any long random string. |
| `MEMBER_PASSWORD` | yes | The shared member password. |
| `ADMIN_PASSWORD` | yes | Organizer password for `/admin-login`. |
| `FIREBASE_PROJECT_ID` | for data pages | Firestore project. |
| `FIREBASE_CLIENT_EMAIL` | for data pages | Service account email. |
| `FIREBASE_PRIVATE_KEY` | for data pages | Service account key (escaped `\n` newlines). |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | for uploads | Storage bucket for images. |
| `APIFY_API_TOKEN` | optional, server-only | Reserved for a future Apify integration; no current app feature reads it. Never expose it with a `NEXT_PUBLIC_` prefix. |

There are no fallback passwords. If `MEMBER_PASSWORD` or `ADMIN_PASSWORD` is unset, that login stays locked and the sign-in page explains why.

## Structure

```
app/                 routes (App Router)
  components/        shared header, footer, password form
  api/               route handlers (auth, posts, events, products, gallery, upload, messages)
  globals.css        design tokens + all shared styles
  layout.tsx         metadata, header, footer
lib/                 auth, session lookup, passwords, Firebase Admin, chat crypto, site links
middleware.ts        gates member and admin routes
tests/e2e/           Playwright route, auth, accessibility, and responsive tests
docs/                deployment runbook
assets/              community media kept out of the public bundle
public/              favicon, icon, manifest, robots, sitemap, published media
```

## Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/`, `/about`, `/donate` | public | Landing, mission, giving |
| `/privacy`, `/terms`, `/accessibility` | public | Policies |
| `/login` | public | Member sign in |
| `/admin-login` | public | Organizer sign in |
| `/admin` | admin | Moderation, events, products, archive uploads |
| `/bulletin` | member | Posts and replies |
| `/calendar` | member | Events and RSVPs |
| `/chat` | member | Encrypted member chat |
| `/community` | member | Shared gallery |
| `/archive` | member | Protected archive collection plus uploaded archive |
| `/shop` | member | Store items managed in the admin |
| `/zines`, `/education`, `/organizing`, `/care` | member | Program pages |

`/events` redirects to `/calendar`; `/shop/success` to `/donate`; legacy `*.html` URLs redirect to their App Router equivalents.

## Auth model

- One shared password per role, checked in `lib/passwords.ts` and signed into an http-only JWT (`lib/auth.ts`).
- `middleware.ts` enforces access before a page renders and redirects to `/login?next=…` or `/admin-login?next=…`.
- Member and admin sessions are mutually exclusive (`sw_auth` vs `sw_admin`).
- Every data API re-checks the session server-side; writes to events, products, and the gallery require the admin role.

## Data

Firestore collections: `posts` (with a `replies` subcollection), `messages`, `events`, `products`, `galleryAssets`. Files uploaded to Firebase Storage through `/api/upload` are served through authenticated `/api/storage` URLs. Uploading archive, community, and product files is admin-only; signed-in members can read them. Existing objects may retain public access and must be reviewed with the Firebase owner; see the [deployment runbook](./docs/deployment-runbook.md).

Chat messages are encrypted in the browser with a shared room key derived from `AUTH_SECRET`. The server and every signed-in member can derive the key, so this is not end-to-end encryption and should not be used for confidential messages.

Archive images are stored outside `public/` and streamed by an authenticated API route; do not make those assets public or expose them through a separate CDN origin.

Event RSVP records are idempotent and keyed by role. Since member and admin accounts use shared passwords, RSVPs do not identify individual attendees and must not be treated as an attendee roster.

Calendar exports intentionally use all-day dates in `America/Denver`; event times remain visible on the site but are not included in exported calendar entries.

## Tests

```bash
npm test                    # unit tests (vitest)
npm run test:e2e            # Playwright; login-flow tests need configured passwords and Firebase
npm run test:a11y           # axe-core checks, including protected pages with test-only auth
npm run test:responsive     # layout checks
```

The Playwright config builds and starts the app automatically. CI uses a test-only signing secret and signed test cookies for protected routes; no production credentials are required.

## Deployment

The app requires a Node.js/Next.js server runtime (Node.js 22 or newer); it is not configured for static export. GitHub Actions runs lint, type-check, unit tests, production build, Playwright, and protected-page accessibility checks for pull requests and pushes to `main`, but does not deploy. AWS Amplify Hosting and the Porkbun-managed domain still require account-owner setup. See the [deployment runbook](docs/deployment-runbook.md) for Amplify compatibility, environment-variable risks, DNS setup, verification, and rollback.

## Follow-up TODOs

The code-review items previously listed here have been implemented. Production account setup and migration limitations are tracked in the [deployment runbook](docs/deployment-runbook.md).

Post images are uploaded as part of post creation and stored under a server-generated, post-specific path. Legacy images in the former shared `posts/` folder are retained on post deletion to avoid deleting an unrelated upload; clean those up separately if needed.

Legacy RSVP arrays are normalized the next time an event receives an RSVP. Product image cleanup applies to stored product paths and legacy `/api/storage` URLs; unrelated external image URLs are not deleted.

Product image cleanup runs before product metadata changes because Firebase Storage and Firestore do not share a transaction. If Storage cleanup fails, the metadata change is not made; if the subsequent Firestore write fails, the API reports that the old image was already removed and metadata may need manual repair.
