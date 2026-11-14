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
| `/archive` | member | Static collection plus uploaded archive |
| `/shop` | member | Store items managed in the admin |
| `/zines`, `/education`, `/organizing`, `/care` | member | Program pages |

`/events` redirects to `/calendar`; `/shop/success` to `/donate`; legacy `*.html` URLs redirect to their App Router equivalents.

## Auth model

- One shared password per role, checked in `lib/passwords.ts` and signed into an http-only JWT (`lib/auth.ts`).
- `middleware.ts` enforces access before a page renders and redirects to `/login?next=…` or `/admin-login?next=…`.
- Member and admin sessions are mutually exclusive (`sw_auth` vs `sw_admin`).
- Every data API re-checks the session server-side; writes to events, products, and the gallery require the admin role.

## Data

Firestore collections: `posts` (with a `replies` subcollection), `messages`, `events`, `products`, `galleryAssets`. Images are uploaded to Firebase Storage through `/api/upload` and served from a public URL, so treat every upload as public.

Chat messages are encrypted in the browser with a room key derived from `AUTH_SECRET` and delivered only to signed-in members.

## Tests

```bash
npm test                      # unit tests (vitest)
MEMBER_PASSWORD=… ADMIN_PASSWORD=… npm run test:e2e         # Playwright
MEMBER_PASSWORD=… npm run test:a11y                        # axe-core checks
npm run test:responsive                                    # layout checks
```

The Playwright config builds and starts the app automatically.
