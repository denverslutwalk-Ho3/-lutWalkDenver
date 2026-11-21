# Beginner Developer Guide

## Learn in this order

1. [README.md](../../README.md) explains the application model and known limitations.
2. [app/layout.tsx](../../app/layout.tsx) shows the shared page shell.
3. [middleware.ts](../../middleware.ts) shows page access control.
4. [lib/authz.ts](../../lib/authz.ts) shows server-side session checks.
5. [app/bulletin/page.tsx](../../app/bulletin/page.tsx) is a practical UI/API example.
6. [app/api/posts/route.ts](../../app/api/posts/route.ts) shows validation, Firestore, and Storage.
7. [lib/firebase-admin.ts](../../lib/firebase-admin.ts) shows server-only Firebase setup.
8. [tests/unit](../../tests/unit) shows route behavior with mocked services.

## Key terms

- **Frontend:** Browser-rendered React components under `app/`.
- **Backend:** Server code in `middleware.ts`, `app/api/**`, and `lib/`.
- **API:** A same-origin URL such as `/api/posts` that accepts HTTP requests and returns JSON or media.
- **Component:** A reusable piece of React UI.
- **Route:** A URL that Next.js renders or handles.
- **Middleware:** Code that runs before matching pages render.
- **Database:** Persistent application data, implemented here with Firestore.
- **Collection:** A group of related Firestore documents.
- **Document:** A single Firestore record.
- **Subcollection:** A collection nested under a document, such as post replies.
- **Authentication:** Verifying a member or admin session.
- **Authorization:** Deciding what that authenticated role may do.
- **Session:** The signed cookie presented by the browser.
- **Cookie:** Browser-stored small credential or site metadata. The session cookies are HttpOnly.
- **Environment variable:** Deployment/server configuration read by `process.env`.
- **Dependency:** A package declared in `package.json` and installed through npm.
- **Build:** The process that compiles and prepares the app for execution.
- **Deployment:** Publishing the built app to a host.

## Safe change checklist

Before changing a feature:

1. Identify every page and API route that uses it.
2. Search for environment variables and collection names.
3. Check middleware and API authorization separately.
4. Review existing unit and browser tests.
5. Preserve legacy Firestore fields and redirect compatibility.
6. Test lint, types, unit tests, and the relevant build.
7. For auth, storage, media, or Firebase changes, perform an independent security review.

## What can break

| Change | Potential consequence |
|---|---|
| Removing middleware matchers | Protected pages could render before API checks |
| Removing API authorization | Direct browser/API calls could bypass UI restrictions |
| Changing cookie names | Existing sessions and middleware would stop matching |
| Changing Firestore field names | Existing records and stored data could become unreadable |
| Making Storage public | Private member/archive content could leak |
| Changing upload allowlists | Valid uploads could fail or unsafe files could be accepted |
| Removing redirects | Existing links and old static URLs could become dead |
| Removing password-version logic | Rotated passwords might leave old sessions active |

## Useful commands

```bash
npm ci
npm run lint
npx tsc --noEmit
npm test
npm run build
npm run test:e2e
npm run test:a11y
npm run test:responsive
```

Local Playwright runs need the test-only environment described by `playwright.config.ts`. Live Firebase and Mistral behavior require separately configured services.
