# AWS Amplify deployment runbook

## Status and scope

Checked on 2026-11-14. This is a deployment preparation guide; no AWS, GitHub, or Porkbun account settings have been changed and no deployment has been run.

- Repository: `denverslutwalk-Ho3/-lutWalkDenver`, default/target production branch `main`.
- Hosting target: AWS Amplify Hosting, Next.js SSR compute.
- Registrar and DNS provider: Porkbun (as supplied by the domain owner).
- Canonical hostname: `https://slutwalkdenver.gay/`.
- The repository has no confirmed Amplify app, GitHub-to-Amplify connection, deployment history, or production secrets.
- Public checks made earlier in this session found the apex returning a GitHub Pages 404 and `www` parking/redirecting to the apex. The apex resolved to GitHub Pages addresses. Recheck before making any DNS change.

## Repository and application audit

This is a root-level npm application (not a monorepo) using `package.json` and the committed `package-lock.json`. It uses Next.js 15.5.29, React 19.2.8, and Firebase Admin 14.5.1. The locked Firebase Admin version declares Node.js `>=22`; `.nvmrc`, `package.json`'s engine, CI, and the Amplify build spec require Node 22.

The Next.js App Router contains public pages, member pages, `/admin`, and API route handlers for auth, posts, events, products, gallery, messages, and uploads. The app uses `next build` and has no static-export setting or `next export` command. There is no root or `public/index.html`; `/` is the App Router page. `public/CNAME` is retained as a legacy domain marker; it does not configure Amplify or replace the Next.js root route.

### Amplify compatibility

AWS currently documents support for Next.js versions 12–15 with SSR compute, including App Router, API routes, dynamic routes, middleware, environment variables, and image optimization. AWS explicitly does **not** support Edge middleware.

The repository's middleware was relying on Next.js's default Edge runtime. It now declares `runtime: 'nodejs'`. Next.js 15.5.29 supports the stable Node.js middleware runtime. Middleware uses Web Crypto to validate the existing signed cookies and does not import Firebase Admin or other Node-only packages. API handlers use the Node.js runtime by default, as required by Firebase Admin.

The checked-in [amplify.yml](../amplify.yml) pins the build to Node 22 via [`.nvmrc`](../.nvmrc), installs with `npm ci`, builds with `npm run build`, and publishes the `.next` Next.js SSR artifact. AWS documentation says a checked-in build spec overrides console build settings, so its `.next` artifact path is explicitly set. No static `out` directory or `output: 'export'` is configured.

**Compute-runtime verification remains outstanding:** the AWS support guide confirms the Next.js 15 platform and excludes Edge middleware, but this repository cannot inspect the future Amplify app's actual SSR compute runtime. Confirm the deployed compute can run Node 22 or newer (required by the locked Firebase Admin package) before connecting production traffic. The build spec selects the build-image Node version; it is not proof of the managed SSR runtime version.

AWS references:

- [Amplify support for Next.js](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html)
- [Deploying a Next.js SSR application](https://docs.aws.amazon.com/amplify/latest/userguide/deploy-nextjs-app.html)
- [Amplify build settings](https://docs.aws.amazon.com/amplify/latest/userguide/build-settings.html)
- [Next.js 15 middleware runtime](https://nextjs.org/docs/15/app/api-reference/file-conventions/middleware)

## Authentication and access control

- `/` is public and links to member sign-in at `/login`.
- `/api/auth/login` issues the member `sw_auth` cookie; `/api/auth/admin-login` issues the separate admin `sw_admin` cookie.
- Member sessions last 30 days; admin sessions last 8 hours. Both cookies are `HttpOnly`, `SameSite=Lax`, path `/`, and `Secure` in production.
- Middleware checks the signed role claim. Member routes accept a member or admin claim; `/admin` requires the admin claim.
- The archive page requires a signed member/admin session. Archive images are served by an authenticated API route from files outside `public/`.
- API handlers also check authorization server-side; write routes for events, products, and gallery assets require admin authorization.
- Login clears the other role's session cookie. Do not weaken middleware, change the cookie names, or disable `Secure`.

The authentication values are read server-side from environment variables. Do not put passwords, `AUTH_SECRET`, Firebase service-account identifiers, or Firebase private keys in `NEXT_PUBLIC_*` variables, client components, source files, workflow secrets, or logs.

The login routes use one shared password per role. Each route now applies a Firestore-transaction-backed limit of 10 attempts per client address and role in a 15-minute window, returning `429` with `Retry-After` when exceeded. The address is HMACed with `AUTH_SECRET` before persistence; raw addresses are not stored. This limiter depends on Firestore availability and the hosting proxy supplying a trustworthy `X-Forwarded-For` or `X-Real-IP` value. Configure Firestore TTL for `internal_login_rate_limits.expiresAt`, and retain a suitable edge/WAF rate limit as defense in depth against distributed attempts. Test limits without creating a shared-account lockout that could deny access to members.

## Environment variables and secret handling

The current code references:

| Variable | Classification | Use |
| --- | --- | --- |
| `AUTH_SECRET` | Server secret | Signs member/admin cookies and derives the chat room key. |
| `MEMBER_PASSWORD` | Server secret | Shared member password. |
| `ADMIN_PASSWORD` | Server secret | Separate admin password. |
| `FIREBASE_PROJECT_ID` | Server configuration | Firebase Admin project identifier. |
| `FIREBASE_CLIENT_EMAIL` | Server credential identifier | Firebase Admin service-account email. |
| `FIREBASE_PRIVATE_KEY` | Server secret | Firebase Admin private key; code converts escaped `\n` into newlines. |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Public identifier, currently read server-side | Bucket name passed to Firebase Admin Storage. This is not a credential. |

No Firebase client SDK or client Firebase configuration is used by the current application. `.env.example` contains placeholders only; `.gitignore` excludes local environment files and common credential files. Never store real values in the repository.

**Amplify secret handling is a deployment blocker to resolve before production.** AWS's Next.js SSR instructions say build-time Amplify variables are not automatically available to the Next.js server runtime; the documented approach writes selected variables to `.env.production` before the build. AWS warns that credentials in deployment artifacts can be read by users with artifact access. This repo's `.env.production` must not contain passwords, signing keys, or the Firebase private key without an explicitly accepted access/security model.

Before deploying, choose and verify a supported way for the SSR compute to obtain server secrets without exposing them in downloadable artifacts. For example, an account owner/security engineer can authorize a runtime secrets integration using AWS Systems Manager Parameter Store or Secrets Manager and an appropriately scoped Amplify SSR compute role. **This repository does not currently implement runtime retrieval from AWS secret storage.** Do not assume Amplify console environment variables alone solve that runtime problem; verify the selected mechanism with a test secret in a non-production branch and inspect its artifacts/logs before supplying production values. The workflow/build spec intentionally does not copy environment variables to `.env.production`.

If passwords were pasted into chat or other shared systems, treat them as exposed and replace them through an authorized secret-management process before production. Changing `AUTH_SECRET` invalidates existing sessions and changes the chat key; coordinate that change with the application owner.

## Firebase readiness

`lib/firebase-admin.ts` lazily initializes Firebase Admin for Firestore and Storage from the project ID, service-account email, private key, and bucket name. The API routes use Firestore collections for posts/replies, messages, events, products, and gallery assets; uploads use Firebase Storage. No Firebase client API key/Auth credential is referenced.

The repository contains no `firebase.json`, Firestore rules, or Storage rules to review or deploy. Firebase Admin uses service-account IAM and bypasses client Security Rules; do not broaden service-account permissions or weaken rules to make deployment work. Confirm the production project, enabled Firestore/Storage services, and least-privilege service-account access with the Firebase owner.

Uploads no longer make objects public. `/api/upload` returns a same-origin `/api/storage` URL; the read route requires a signed-in session and serves files with private no-store caching. Upload authorization remains admin-only for archive, community, and product folders; signed-in members can read these assets as needed by the member pages. New uploads remain private only if the Firebase Storage bucket IAM policy does not grant public reads.

Archive images live in `assets/community-media/archive/` and are included in the server route's output trace. They are not placed in `public/`; keep them on the authenticated server route and do not expose them through a separate static bucket or CDN origin.

**Existing-object migration remains a production blocker:** previously uploaded files may still have public ACLs or public bucket access, and their direct URLs may already have been copied elsewhere. The Firebase owner must inspect the bucket policy and revoke public access for legacy objects as appropriate, then validate that private uploads and authorized reads work. Do not remove or rewrite production objects without an approved migration and backup.

The login rate limiter uses Firestore and requires the Firebase service account to read/write the `internal_login_rate_limits` collection. Configure a Firestore TTL policy on its `expiresAt` field; application checks still enforce the 15-minute window if TTL cleanup is delayed. Rate-limit records contain an HMAC-derived identifier, attempt count, and timestamps, not raw client addresses or passwords.

## Connect GitHub to AWS Amplify (manual account action)

1. In the AWS Amplify console, choose **Create new app** and authorize the AWS Amplify GitHub App to access only the intended repository.
2. Select `denverslutwalk-Ho3/-lutWalkDenver` and branch `main`. Keep `main` as the only production branch.
3. Use the repository root as the app root. Confirm Amplify detects Next.js SSR/compute, not static export.
4. Review the committed `amplify.yml`; do not override it with an `out` artifact or static adapter.
5. Configure a least-privilege Amplify service role and an SSR compute role only if needed for the approved runtime secrets integration.
6. Require the GitHub Actions CI check before merging to `main` using repository branch protection. Verify the check is required; that repository setting is not managed here.
7. If Amplify pull-request previews are enabled, keep them on preview hostnames, do not bind the production domain, and do not provide production secrets to untrusted PR builds.
8. Confirm the first successful Amplify build is from the intended reviewed `main` commit before custom-domain setup.

GitHub Actions in `.github/workflows/ci.yml` runs install, lint, TypeScript, unit tests, and build for PRs and pushes to `main`; it has read-only repository permission and no production credentials. It is a verification workflow, not a deployment workflow.

## Connect `slutwalkdenver.gay` through Porkbun (manual account action)

First deploy the app to its Amplify-provided domain and confirm it is healthy. Then:

1. In the Amplify console, open the deployed app's **Hosting → Custom domains**, choose **Add domain**, and enter `slutwalkdenver.gay`.
2. Choose manual third-party DNS configuration; do not change Porkbun nameservers or migrate DNS as part of this runbook.
3. Configure the domain mapping with the apex `slutwalkdenver.gay` attached to the production `main` branch and set `www.slutwalkdenver.gay` to redirect to the apex. AWS's default mapping may instead make the apex redirect to `www`; change the mapping to match the required apex canonical domain.
4. Select the Amplify-managed certificate unless the owner has a specific approved certificate plan.
5. In Amplify's **View DNS records**, copy the exact generated validation and routing record names/values. AWS generates app- and certificate-specific values; they cannot be known or safely invented before this account-side step.
6. In Porkbun DNS, inspect the complete existing zone before edits. Add only the records Amplify displays (typically certificate/domain-validation CNAMEs, a `www` CNAME, and an apex ALIAS/ANAME where supported). Do not use records from examples or this document. Preserve MX, existing mail-related TXT, and unrelated verification/service records. Replace only conflicting website records after confirming their purpose.
7. Keep the ACM validation CNAME in Porkbun; AWS uses it for certificate validation/renewal. Do not delete it after initial verification.
8. Wait for Amplify to show the domain as available and certificate as issued before switching production traffic. If Porkbun cannot represent the apex ALIAS/ANAME Amplify requires, stop and ask the domain owner/AWS support for an approved DNS approach; do not change nameservers without explicit approval.

AWS references:

- [Custom domains with third-party DNS providers](https://docs.aws.amazon.com/amplify/latest/userguide/to-add-a-custom-domain-managed-by-a-third-party-dns-provider.html)
- [Amplify custom domains](https://docs.aws.amazon.com/amplify/latest/userguide/custom-domains.html)
- [Porkbun DNS records](https://kb.porkbun.com/category/14-dns)

Verify only after the Amplify app/domain setup completes:

```sh
dig slutwalkdenver.gay A
dig slutwalkdenver.gay AAAA
dig slutwalkdenver.gay CNAME
dig www.slutwalkdenver.gay CNAME
curl -sSIL https://slutwalkdenver.gay/
curl -sSIL https://www.slutwalkdenver.gay/
curl -sSIL http://slutwalkdenver.gay/
```

Confirm the apex returns the current app, the certificate is valid, HTTP redirects to HTTPS, and `www` ends at `https://slutwalkdenver.gay/`. Public resolution or a certificate alone is not proof that the current app is deployed.

## Deployment, verification, rollback

After account-owner setup and required CI checks, merge reviewed changes to `main`. Amplify should automatically build the connected production branch. Confirm the commit ID and successful build in Amplify before announcement.

Post-deployment checks:

- Public `/` serves the current app.
- `/login` and `/admin-login` are separate gates.
- Anonymous requests to member pages and `/admin` redirect to the correct gate.
- Member login grants member access but not `/admin`; admin login grants admin access and keeps the separate role claim.
- Login response cookies are `HttpOnly`, `Secure`, `SameSite=Lax`, path `/`, with the intended expiration.
- Protected API requests are unauthorized without a session; test authorized Firebase routes with non-production test data.
- Firebase-backed reads/writes and Firestore-backed login throttling work against the intended production project; private media access is verified and any legacy public object access is reviewed.
- Canonical apex, `www` redirect, HTTPS/TLS, and DNS validation work from an external resolver.
- No production secret appears in build logs, browser bundles, downloadable artifacts, or error output.

For rollback, use Amplify's deployment history to redeploy the last known-good production build. If the code change caused the failure, revert it through a reviewed commit to `main` and let CI/Amplify build it. Confirm the rollback commit and repeat route, auth, Firebase, and domain checks. Do not point the domain to an unreviewed PR preview.

## Dependency security

The lockfile resolves Next.js 15.5.29 and Firebase Admin 14.5.1. To remediate audit findings without moving the application to a new Next.js major, `package.json` overrides Next.js's pinned PostCSS dependency to 8.5.33. Vitest was updated to 5.1.0 to address the critical Vitest/Tinypool advisories, and the affected TypeScript-ESLint dependency's minimatch was overridden to 11.0.8. These dependency updates were validated with `npm ci`, lint, unit tests, TypeScript, and a production build. The overrides cross the transitive dependencies' declared major/minor ranges and must be retested when updating Next.js or ESLint/Vitest.

On 2026-11-14, both `npm audit` and `npm audit --omit=dev` reported zero vulnerabilities after these changes. Re-run both commands on future dependency updates; a clean audit is not a substitute for application security review.

## Local verification

```sh
npm ci
npm run lint
npx tsc --noEmit
npm test
npm run build
```

`npm run start` is for local production-mode validation. Amplify manages its deployed Next.js compute runtime; do not add a static `next export` or standalone static server command.
