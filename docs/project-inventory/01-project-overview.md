# Project Overview

## What this application is

SlutWalk Denver is a Next.js community hub for public information and a private, shared-password member area. It includes discussion posts, replies, member chat, events, an archive, galleries, a store, reporting, community agreements, and optional Mistral-backed AI assistants.

## Implemented technology

| Technology | Plain-language purpose | Repository evidence | Verification status |
|---|---|---|---|
| Next.js 15 App Router | Page routing, server rendering, API routes, middleware, and builds | `package.json`, `app/`, `middleware.ts`, `next.config.mjs` | Implemented and built locally |
| React 19 | Interactive page components | `app/**/*.tsx`, `package.json` | Implemented and built locally |
| TypeScript | Typed application and test code | `app/`, `lib/`, `tests/`, `tsconfig.json` | Implemented; type check passes after build-generated Next types exist |
| Node.js 22+ | Server runtime for Next.js and Firebase Admin | `package.json`, `.nvmrc`, `.github/workflows/ci.yml` | Required and used locally |
| npm | Dependency installation and scripts | `package.json`, `package-lock.json` | Implemented |
| Firebase Admin | Server-side Firestore and Storage access | `lib/firebase-admin.ts`, `app/api/**` | Implemented; live project not verified locally |
| Cloud Firestore | Community posts, replies, events, media metadata, reports, chat, and settings | API route imports of `firebase-admin/firestore` | Implemented; live data unavailable locally |
| Firebase Storage | Uploaded images, PDFs, post images, and product assets | `app/api/upload/route.ts`, `app/api/storage/route.ts`, `lib/storage-cleanup.ts` | Implemented; live bucket and ACLs unverified |
| JWT-style signed cookies | Shared member/admin session credentials | `lib/auth.ts`, `lib/passwords.ts`, `lib/authz.ts`, `middleware.ts` | Implemented and unit-tested |
| Mistral API | Optional external AI chat completions | `app/api/ai-chat/route.ts`, `lib/ai-chat.ts` | Implemented as server-only integration; live key and service unverified |

## Architecture

The application is a server-and-browser Next.js application:

1. Browser components display public or member pages.
2. Middleware checks signed role cookies for page-level access.
3. React components call same-origin `/api/*` routes.
4. API routes repeat authorization and validation on the server.
5. Firebase Admin reads or writes Firestore and Storage.
6. The API returns JSON or media bytes.
7. The browser updates React state or redirects.

The application is not statically exported. [next.config.mjs](../../next.config.mjs) contains no `output: 'export'` setting, and the README documents server-runtime hosting requirements.

## External services

| Service | Status |
|---|---|
| Firebase Admin / Firestore / Storage | Configured in code; live project, credentials, rules, and bucket ACLs unverified |
| Mistral | Implemented; key unverified |
| Apify | Mentioned in environment/deployment documentation only; no current application integration |
| AWS Amplify | Build and deployment runbook exist; no live app or deployment verified |
| Porkbun | Domain provider named in documentation; DNS and ownership not verified |

## Health snapshot

- **Architecture:** Adequate
- **Security implementation:** Strong in code, with documented deployment gaps
- **Database implementation:** Strong in source but live integration unverified
- **Testing:** Good unit coverage and established browser suites
- **Deployment readiness:** Needs attention
- **Beginner accessibility:** Adequate, with the app split into understandable page and API folders
