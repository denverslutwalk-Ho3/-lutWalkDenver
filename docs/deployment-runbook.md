# Vercel deployment runbook

## Status and scope

Hosting target chosen by the project owner: **Vercel** (Next.js SSR hosting). AWS/Amplify, GitHub Pages, and Apify hosting are explicitly out of scope for application hosting. Checked 2026-11-21. This is a deployment preparation guide; **no deployment, DNS, or account configuration has been performed**, and nothing in this repository proves the site is live.

- Repository: `denverslutwalk-Ho3/-lutWalkDenver`, default production branch `main` (verified via the GitHub API).
- Application hosting: Vercel. No Vercel project exists yet; connecting the repository to Vercel is a manual account step below.
- Registrar and DNS provider: Porkbun (as supplied by the domain owner). Do not change Porkbun nameservers.
- Canonical hostname: `https://slutwalkdenver.gay/`.
- Database and file storage: existing Firebase project `we-can-chat-13c4u` (owner-supplied). The repository cannot verify Firestore/Storage enablement or service-account IAM; the Firebase owner must.
- Automation and research platform: Apify. No application code reads `APIFY_API_TOKEN`; there is no Apify integration to deploy today. Never auto-publish scraped content — any Apify-backed feature must preserve human review.

A previous public check found the apex resolving to GitHub Pages (404) and `www` parking/redirecting to the apex. Recheck current DNS before editing the zone.

## Service responsibilities

| Concern | Provider |
| --- | --- |
| Source control and CI (lint, type-check, tests, build) | GitHub / GitHub Actions |
| Application hosting (Next.js SSR, API routes, middleware, TLS) | Vercel |
| Domain registration and authoritative DNS | Porkbun |
| Database (Firestore) and file storage (Firebase Storage) | Firebase project `we-can-chat-13c4u` |
| Automation / research (future) | Apify, server-side only |

## Repository and application audit

Root-level npm application (not a monorepo) using `package.json` and the committed `package-lock.json` (lockfile v3, `npm ci` required). Next.js 15.5.29, React 19.2.8, Firebase Admin 14.5.1; `engines` and `.nvmrc` require Node.js 22, which Vercel supports.

App Router application with public pages, member pages, `/admin`, and Node.js API route handlers for auth, posts, events, products, gallery, messages, and uploads. No `output: 'export'`, no `next export`, no static `out/` artifact: middleware and server routes need the Node.js server runtime that Vercel provides. There is no root or `public/index.html`; `/` is the App Router page. `public/CNAME` is a legacy domain marker retained from the old static site; it does not configure Vercel or replace the Next.js root route. `amplify.yml` is retained but unused — do not connect the repository to AWS Amplify.

### Vercel compatibility

- **No `vercel.json` is needed.** Vercel detects Next.js from `package.json` and applies the zero-config Next.js pipeline, including the redirects and security headers defined in `next.config.mjs`.
- **Middleware** declares `runtime: 'nodejs'` (stable in Next.js 15.5 and supported on Vercel). It validates the signed cookies with Web Crypto and imports no Firebase or Node-only packages.
- **API routes** run on the Node.js runtime by default, as required by Firebase Admin. `outputFileTracingIncludes` adds `assets/community-media/archive/**` to the archive media route's serverless bundle, keeping archive images server-side and authenticated on Vercel too.
- **Image optimization** (`next/image` with the `storage.googleapis.com` remote pattern) runs in Vercel's image service without extra configuration.
- **Runtime environment variables**: unlike AWS Amplify, Vercel makes project environment variables available to the Next.js server runtime directly — there is no need to write `.env.production`, and the build-time-variable workaround documented previously for Amplify does not apply.
- **Outstanding, not verified by this repository:** Vercel serverless regions and network egress must reach Firestore and Firebase Storage; verify with a non-production check after the first deploy. Do not connect production traffic before that check.
- **Follow-up attached to the pending Firebase client sign-in work:** the Content-Security-Policy in `next.config.mjs` sets `connect-src 'self'` and `script-src 'self' 'unsafe-inline'`, which blocks browser-side Firebase calls and the reCAPTCHA script. Widening those directives must be reviewed and landed in the same change that wires Firebase sign-in into the UI, not as a silent security relaxation.

## Authentication and access control

- `/` is public and links to member sign-in at `/login`.
- `/api/auth/login` issues the member `sw_auth` cookie; `/api/auth/admin-login` issues the separate admin `sw_admin` cookie.
- Member sessions last 30 days; admin sessions last 8 hours. Both cookies are `HttpOnly`, `SameSite=Lax`, path `/`, and `Secure` in production.
- Middleware checks the signed role claim. Member routes accept a member or admin claim; `/admin` requires the admin claim.
- The archive page requires a signed member/admin session. Archive images are served by an authenticated API route from files outside `public/`.
- API handlers also check authorization server-side; write routes for events, products, and gallery assets require admin authorization.
- Login clears the other role's session cookie. Do not weaken middleware, change the cookie names, or disable `Secure`.

The authentication values are read server-side from environment variables. Do not put passwords, `AUTH_SECRET`, Firebase service-account identifiers, or Firebase private keys in `NEXT_PUBLIC_*` variables, client components, source files, workflow secrets, or logs.

The login routes use one shared password per role. Each route applies a Firestore-transaction-backed limit of 10 attempts per client address and role in a 15-minute window, returning `429` with `Retry-After` when exceeded; the same limiter protects the Firebase sign-in bridge route (`/api/auth/firebase`). The address is HMACed with `AUTH_SECRET` before persistence; raw addresses are not stored. This limiter depends on Firestore availability and the hosting proxy supplying a trustworthy `X-Forwarded-For` value. Configure Firestore TTL for `internal_login_rate_limits.expiresAt`, and retain a suitable edge/WAF rate limit as defense in depth against distributed attempts. Test limits without creating a shared-account lockout that could deny access to members.

If passwords were pasted into chat or other shared systems, treat them as exposed and replace them through an authorized secret-management process before production. Changing `AUTH_SECRET` invalidates existing sessions and changes the chat room key; coordinate that change with the application owner.

## Environment variables and secret handling

`.env.example` lists every variable the application reads, with placeholders only. Configure the same variables in Vercel (Project → Settings → Environment Variables); there is no application-side difference between production and preview apart from the scopes you assign.

| Variable | Classification | Required for production | Use |
| --- | --- | --- | --- |
| `AUTH_SECRET` | Server secret | Yes | Signs member/admin cookies and derives the chat room key. |
| `MEMBER_PASSWORD` | Server secret | Yes | Shared member password. |
| `ADMIN_PASSWORD` | Server secret | Yes | Shared administrator password. |
| `FIREBASE_PROJECT_ID` | Server configuration | Yes | Firebase Admin project identifier (`we-can-chat-13c4u`). |
| `FIREBASE_CLIENT_EMAIL` | Server credential identifier | Yes | Firebase Admin service-account email. |
| `FIREBASE_PRIVATE_KEY` | Server secret | Yes | Firebase Admin private key; code converts escaped `\n` into newlines. |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Public identifier | Yes | Bucket name passed to Firebase Admin Storage. Not a credential. |
| `FIREBASE_PRIVATE_KEY` note | — | — | In the Vercel dashboard, set the value on a single line with literal `\n` sequences, exactly as in `.env.example`. |
| `MISTRAL_API_KEY` | Server secret | Only for `/ai-chat` | Server-only Mistral key; the assistant stays disabled while unset. Do not prefix with `NEXT_PUBLIC_`. |
| `MISTRAL_MODEL` | Server configuration | No | Optional model name; defaults to `mistral-small-latest`. |
| `APIFY_API_TOKEN` | Reserved | No | Reserved server-only token for a future Apify-backed feature; no current code reads it. |
| `BASE_URL`, `SKIP_WEBSERVER` | Local/test only | Never | Playwright test configuration. |
| `BASE44_PREVIEW_MODE`, `BASE44_PUBLIC_HOST_SUFFIX` | Sandbox preview only | Never | Sandbox preview origin override in `next.config.mjs`; unset in production. |

Vercel secret hygiene:

- Store values only in Vercel's project settings (Production scope for production; Preview scope at most for non-production preview values). Never commit real values, never paste them into chat, issues, or this repository.
- Do not provide production secrets to untrusted pull-request previews; keep preview deployments scoped to non-production variables. The Vercel project can enforce secrets not being printed in logs, but review build logs before sharing them.
- If a value ever appears in a log, browser bundle, or error output, rotate it through Vercel's environment settings and the originating provider.

## Firebase readiness

`lib/firebase-admin.ts` lazily initializes Firebase Admin for Firestore, Storage, and (for the pending sign-in bridge) Authentication from the project ID, service-account email, private key, and bucket name. The API routes use Firestore collections for posts/replies, messages, events, products, gallery assets, reports, agreement acceptances, and login rate limits; uploads use Firebase Storage. A client-side Firebase Web SDK module (`lib/firebase.ts`) contains only public web-app identifiers and is not yet imported by any page or component.

The repository contains no `firebase.json`, Firestore rules, or Storage rules to review or deploy. Firebase Admin uses service-account IAM and bypasses client Security Rules; do not broaden service-account permissions or weaken rules to make deployment work. Confirm with the Firebase owner: the `we-can-chat-13c4u` project has Firestore and Storage enabled, the service account is least-privilege, and the deployed Vercel environment's `FIREBASE_PROJECT_ID` matches this project before sign-in or storage features go live.

Uploads no longer make objects public. `/api/upload` returns a same-origin `/api/storage` URL; the read route requires a signed-in session and serves files with private no-store caching. Upload authorization remains admin-only for archive, community, and product folders; signed-in members can read these assets as needed by the member pages. New uploads remain private only if the Firebase Storage bucket IAM policy does not grant public reads.

Archive images live in `assets/community-media/archive/` and are included in the server route's output trace (bundled by Vercel). They are not placed in `public/`; keep them on the authenticated server route and do not expose them through a separate static bucket or CDN origin.

**Existing-object migration remains a production blocker:** previously uploaded files may still have public ACLs or public bucket access, and their direct URLs may already have been copied elsewhere. The Firebase owner must inspect the bucket policy and revoke public access for legacy objects as appropriate, then validate that private uploads and authorized reads work. Do not remove or rewrite production objects without an approved migration and backup.

The login rate limiter uses Firestore and requires the Firebase service account to read/write the `internal_login_rate_limits` collection. Configure a Firestore TTL policy on its `expiresAt` field; application checks still enforce the 15-minute window if TTL cleanup is delayed.

## Connect GitHub to Vercel (manual account action)

1. Verify the repository default branch is `main` before pointing any host at it.
2. From the GitHub account that owns `denverslutwalk-Ho3/-lutWalkDenver`, sign in to Vercel and use **Add New → Project**; install the Vercel GitHub App for this repository only.
3. Import `denverslutwalk-Ho3/-lutWalkDenver`. Vercel should detect the **Next.js** framework preset with build command `npm run build` (or `next build`) and Node 22 from `engines`. Override nothing unless the dashboard shows a wrong preset.
4. Keep `main` as the production branch. Branch protection on `main` should require the existing GitHub Actions CI check; that setting is managed in GitHub, not Vercel or this repository.
5. Configure environment variables (table above) as Production scope. Leave Preview scope unassigned for production secrets.
6. Trigger the first deployment (push to `main` or Redeploy), then confirm the deployment succeeds and the app is served on Vercel's provided `*.vercel.app` domain.
7. If pull-request previews are enabled, keep them unlisted and on preview hostnames; do not bind the production domain to a preview and do not provide production secrets to preview scopes.
8. GitHub Actions in `.github/workflows/ci.yml` runs install, lint, TypeScript, unit tests, and build for PRs and pushes to `main`; it has read-only repository permission and no production credentials. It is a verification workflow, not a deployment workflow.

## Deploy and verify (manual account action)

1. Confirm the commit ID shown in the Vercel deployment matches the reviewed `main` commit you intend to publish.
2. Open the deployed `*.vercel.app` URL and check: public `/` serves the app; anonymous requests to member pages and `/admin` redirect to `/login` and `/admin-login`; member and admin sign-in behave as described above; logout works.
3. With production Firebase variables configured and verified on a non-production dataset first, check Firestore-backed reads/writes, Firestore-backed login throttling (429 behavior), and authenticated media access.
4. A successful build and green checks do **not** prove Firestore/Storage connectivity, production authentication, or secret correctness in the Vercel runtime — verify each explicitly before connecting the domain.

## Connect `slutwalkdenver.gay` through Porkbun (manual account action)

First deploy to Vercel's provided domain and confirm it is healthy. Then:

1. In the Vercel dashboard, open the project → **Settings → Domains**, add `slutwalkdenver.gay`, and add `www.slutwalkdenver.gay`. Configure the apex as the canonical host and `www` to redirect to the apex (Vercel lets you set the redirect direction when adding the domains).
2. Use manual third-party DNS configuration (Vercel shows the DNS records instead of changing nameservers). Do not change Porkbun nameservers or use Vercel-managed DNS.
3. In Vercel's domain panel, copy the exact displayed record values. Vercel supplies its current apex and `www` routing records in the dashboard; they are app- and account-specific. Do not use record values from examples, older runbooks, memory, or this document — they change and Vercel's dashboard is authoritative.
4. In Porkbun DNS, inspect the complete existing zone before edits. Add only the records Vercel displays (an apex routing record where Porkbun supports ALIAS/ANAME, and a `www` CNAME). Preserve MX, existing mail-related TXT, and unrelated verification/service records. Replace only conflicting website records after confirming their purpose. Do not guess record values and do not change nameservers without explicit approval.
5. Vercel issues and renews the HTTPS certificate automatically after DNS validates. Keep any validation records until Vercel shows the domain as active and the certificate as issued.
6. Wait for Vercel to show both domains as active with a valid certificate before considering production traffic switched.

Verify DNS and TLS from an external resolver only after the Vercel domain setup completes:

```sh
dig slutwalkdenver.gay A
dig slutwalkdenver.gay AAAA
dig www.slutwalkdenver.gay CNAME
curl -sSIL https://slutwalkdenver.gay/
curl -sSIL https://www.slutwalkdenver.gay/
curl -sSIL http://slutwalkdenver.gay/
```

Confirm the apex returns the current app, the certificate is valid, HTTP redirects to HTTPS, and `www` ends at `https://slutwalkdenver.gay/`. Public resolution or a certificate alone is not proof that the current app is deployed.

## Troubleshooting

- **Environment variables not found / 503 on sign-in:** the deployed runtime is missing a required variable, or its Vercel scope does not apply to Production. Check Project → Settings → Environment Variables and redeploy; Next.js reads deployment-time values, so changes require a new deployment.
- **`FIREBASE_PRIVATE_KEY` invalid:** the key was pasted with real newlines or stripped escapes. Store it as a single line with literal `\n` sequences as shown in `.env.example`; the code converts them.
- **Firebase auth errors citing the wrong project (`auth/project-not-found`, unexpected audience):** `FIREBASE_PROJECT_ID` in the deployed environment does not match the Firebase project whose client config the app ships. Set it to `we-can-chat-13c4u`.
- **429 sign-in responses or `Retry-After` surprises:** expected behavior from the Firestore-backed limiter; clear the limit documents or wait the window. A 503 instead means Firestore is unreachable — check the service account and Firebase services.
- **Signed cookie rejected / login loops back:** `AUTH_SECRET` differs between deployments or the password-version claim changed. Keep one Production value; rotating `AUTH_SECRET` deliberately invalidates sessions.
- **Archive or upload 404/500:** the serverless bundle is missing `assets/community-media/archive` (trace change) or the storage route lost authorization — check `outputFileTracingIncludes` and the API logs in Vercel → Deployments → Runtime Logs.
- **Custom domain shows a parked/parked-404 page:** old GitHub Pages or Porkbun parking records still in the zone; remove/replace only those records after confirming their purpose.
- **Deployment only fails on Vercel, not locally:** compare the Vercel build logs with `npm run build` output locally; check Node version drift (`engines` requires 22+) and framework preset overrides.

## Rollback

Use Vercel's deployment history: promote the last known-good production deployment from Project → Deployments. If a code change caused the failure, revert it through a reviewed commit to `main` and let CI and Vercel build it. Confirm the rollback commit and repeat route, auth, Firebase, and domain checks. Do not point the domain to an unreviewed PR preview.

## Dependency security

The lockfile resolves Next.js 15.5.29 and Firebase Admin 14.5.1. To remediate audit findings without moving the application to a new Next.js major, `package.json` overrides Next.js's pinned PostCSS dependency to 8.5.33. Vitest was updated to 5.1.0 to address the critical Vitest/Tinypool advisories, and the affected TypeScript-ESLint dependency's minimatch was overridden to 11.0.8. These overrides cross the transitive dependencies' declared major/minor ranges and must be retested when updating Next.js or ESLint/Vitest.

Both `npm audit` and `npm audit --omit=dev` were reported clean on 2026-11-14. Re-run both commands on future dependency updates; a clean audit is not a substitute for application security review.

## Local verification

```sh
npm ci
npm run lint
npx tsc --noEmit
npm test
npm run build
```

`npm start` is for local production-mode validation. Vercel manages the deployed Node.js runtime; do not add static `next export` or a standalone server command.
