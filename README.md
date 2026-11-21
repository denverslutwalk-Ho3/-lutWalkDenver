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
  api/               route handlers (auth, posts, events, products, gallery, upload, messages, ai-chat, ai-agents)
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
| `/bulletin` | member | Categorized discussions, replies, and private reports |
| `/bulletin/[id]` | member | Persistent individual discussion and replies |
| `/community-agreement` | member/admin | Community agreement and role-only acceptance record |
| `/calendar` | member | Events and RSVPs |
| `/chat` | member | Encrypted member chat |
| `/ai-chat` | member | One-on-one AI assistant; admins manage assistants in `/admin` |
| `/community` | member | Shared gallery |
| `/archive` | member | Protected archive collection plus uploaded archive |
| `/shop` | member | Store items managed in the admin |
| `/shop`, `/care` | member | Community store, zines, and consolidated community care, organizing, and education |

`/events` redirects to `/calendar`; `/shop/success` to `/donate`; `/education` and `/organizing` redirect to `/care`; `/zines` redirects to `/shop`; legacy `*.html` URLs redirect to their App Router equivalents.

## Auth model

- One shared password per role, checked in `lib/passwords.ts` and signed into an http-only JWT (`lib/auth.ts`).
- `middleware.ts` enforces access before a page renders and redirects to `/login?next=…` or `/admin-login?next=…`.
- Member and admin sessions are mutually exclusive (`sw_auth` vs `sw_admin`).
- Every data API re-checks the session server-side; writes to events, products, the gallery, and AI assistants require the admin role.

### Admin-editable AI prompts

Admins can create, edit, and delete named assistants in `/admin`; each has a name, a short description of who it is for, and its own system prompt. Members choose an assistant on `/ai-chat` and default to the built-in one.

This changes the security impact of the shared admin password: it now controls not just content and store data but **what every member's assistant says**. Anyone who obtains the admin password can change assistant behavior for all members, including instructions that weaken the tone or focus of replies. Treat that password as control over member-facing AI behavior, rotate it if it may have leaked (sessions are revoked when it changes), and do not share it more widely than necessary.

Prompt-level guardrails are mitigation only. The server prepends the Anchor / Mirror / Reframe / Rapport block, the trauma-informed commitments (dignity, autonomy, human rights; individual experience versus broader claims), and the hard limits (no diagnosis, not a therapist, crisis resources) to every agent prompt on every request, and agent prompts are validated and length-limited server-side. That does **not** guarantee the model follows them and is **not a verified reduction in bias or hallucination**. Model output can still be wrong, biased, or unsafe; prompts are not automatically safety-reviewed. The `/ai-chat` page keeps its crisis resources and "not a therapist" disclosure visible regardless of which assistant is selected.

## Data

Firestore collections: `posts` (with a `replies` subcollection), `messages`, `events`, `products`, `galleryAssets`, `aiAgents` (admin-managed assistant definitions), `reports` (admin-only queue with audit subcollections), and `communityAgreementAcceptances` (role and acceptance time only). Files uploaded to Firebase Storage through `/api/upload` are served through authenticated `/api/storage` URLs. Uploading archive, community, and product files is admin-only; signed-in members can read them. Existing objects may retain public access and must be reviewed with the Firebase owner; see the [deployment runbook](./docs/deployment-runbook.md).

Reports are not exposed through member-facing list APIs. Only admins can read or change report status; the report stores the shared-role label, target references, reason, optional details, and resolution audit trail, but no public member identity or IP address. Agreement acceptance likewise stores only role and version/time, not a public profile.

Chat messages are encrypted in the browser with a shared room key derived from `AUTH_SECRET`. The server and every signed-in member can derive the key, so this is not end-to-end encryption and should not be used for confidential messages.

Archive images are stored outside `public/` and streamed by an authenticated API route; do not make those assets public or expose them through a separate CDN origin.

Event RSVP records are idempotent and keyed by role. Since member and admin accounts use shared passwords, RSVPs do not identify individual attendees and must not be treated as an attendee roster.

Calendar exports intentionally use all-day dates in `America/Denver`; event times remain visible on the site but are not included in exported calendar entries.

## Tests

```bash
npm test                    # unit tests (vitest), including agent validation and admin-only route access
npm run test:e2e            # Playwright; login-flow tests need configured passwords and Firebase
npm run test:a11y           # axe-core checks, including protected pages with test-only auth
npm run test:responsive     # layout checks
```

The Playwright config builds and starts the app automatically. CI uses a test-only signing secret and signed test cookies for protected routes; no production credentials are required.

## Development sequence

1. Understand the existing architecture — completed.
2. Improve the Bulletin layout — completed.
3. Add categories for existing discussions — completed.
4. Add persistent individual thread pages — completed.
5. Add pagination and search — planned after thread routes.
6. Establish community agreements — completed.
7. Build reporting and moderation workflows — initial implementation completed.
8. Evaluate individual member accounts — defer until the community requires individual identity and permissions.
9. Complete independent testing and deployment review — in progress.

### Project constraints

- Preserve accessible mobile layouts.
- Preserve compatibility with existing Firestore posts and reply subcollections.
- Keep the shared-member and organizer authentication model.
- Do not add an external search dependency.
- Do not create public member profiles.
- Make surgical changes instead of replacing working systems.

## Deployment

The app requires a Node.js/Next.js server runtime (Node.js 22 or newer); it is not configured for static export. GitHub Actions runs lint, type-check, unit tests, production build, Playwright, and protected-page accessibility checks for pull requests and pushes to `main`, but does not deploy. The intended host is Apify, but the checked-in `amplify.yml` and [deployment runbook](docs/deployment-runbook.md) describe AWS Amplify; `APIFY_API_TOKEN` is not hosting configuration. Resolve this mismatch and verify the host supports the required runtime before deployment. Porkbun DNS setup must wait until the selected host provides its exact records.

## Follow-up TODOs

The code-review items previously listed here have been implemented. Complete these account-owner and deployment tasks in order:

1. **Confirm the hosting architecture.** Apify is the intended host, but no Apify deployment configuration exists in this repository; the checked-in Amplify build spec and runbook are AWS Amplify-specific. Verify that the chosen Apify service can run this Next.js SSR app, API routes, middleware, and Node.js 22, and can supply server-only secrets at runtime. If not, select a compatible host. Update the deployment configuration and runbook to match before connecting production traffic.
2. **Provision member and admin sign-in.** Set distinct, strong `MEMBER_PASSWORD` and `ADMIN_PASSWORD` values and a high-entropy `AUTH_SECRET` in the host's server-side secret store; never use `NEXT_PUBLIC_*` variables or expose secrets in preview builds, logs, or downloadable artifacts. Confirm the shared-password-per-role model is acceptable: it does not identify individual members or admins. Test anonymous redirects, member access without admin access, admin access, logout, session expiration/revocation, secure role-separated cookies, and login rate limits before launch.
3. **Prepare Firebase.** With the Firebase owner, confirm the production project, Firestore, and Storage are enabled. Provide the server-side Firebase Admin project ID, service-account email/private key, and bucket name with least-privilege IAM access. Configure TTL for `internal_login_rate_limits.expiresAt`, validate trusted proxy address handling, and test required API reads/writes using non-production data. Firebase Admin bypasses client Security Rules, so do not broaden service-account permissions to work around failures.
4. **Review stored media and API behavior.** Inventory existing Storage objects and public access; back up and approve any migration before changing production objects. Verify new uploads remain private and authenticated media routes work for intended roles. Product cleanup cannot be atomic across Storage and Firestore: if Storage deletion succeeds but a Firestore write fails, the API reports the partial state and metadata may need manual repair. Define an owner-visible recovery procedure for that case.
5. **Configure optional integrations only when enabled.** Set `MISTRAL_API_KEY` as a server-only secret only if enabling `/ai-chat`; retain the disclosure that submitted text is sent to Mistral in plaintext and is not end-to-end encrypted. `APIFY_API_TOKEN` is unused by the current app; configure it only if an Apify-backed feature is implemented.
6. **Gate production deploys.** Require the CI checks before merging to the production branch. Keep production credentials out of untrusted pull-request previews. Deploy first to the host's default URL and verify Node.js 22, server-side secret access, protected pages, APIs, Firebase, and private media before attaching the custom domain.
7. **Configure Porkbun after the host is verified.** Inspect and save the current DNS zone first. Use only the exact domain-validation and routing records supplied by the selected host; do not guess record values or change nameservers. Preserve MX, mail-related TXT, and unrelated verification records. Verify DNS, TLS, HTTPS redirects, and apex/`www` canonical behavior after propagation.
8. **Record go-live and rollback checks.** Confirm member/admin access boundaries, protected API behavior, Firebase operations, media privacy, domain routing, and absence of secrets in browser bundles/logs. Document the last-known-good deployment and rollback steps before announcing the site.

Post images are uploaded as part of post creation and stored under a server-generated, post-specific path. Legacy images in the former shared `posts/` folder are retained on post deletion to avoid deleting an unrelated upload; clean those up separately if needed.

Legacy RSVP arrays are normalized the next time an event receives an RSVP. Product image cleanup applies to stored product paths and legacy `/api/storage` URLs; unrelated external image URLs are not deleted.

Product image cleanup runs before product metadata changes because Firebase Storage and Firestore do not share a transaction. If Storage cleanup fails, the metadata change is not made; if the subsequent Firestore write fails, the API reports that the old image was already removed and metadata may need manual repair.
