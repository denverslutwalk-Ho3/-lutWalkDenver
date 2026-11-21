# Authentication and Security Reference

## Authentication versus authorization

- **Authentication** answers whether a browser has a valid member or admin session.
- **Authorization** answers whether that session may perform a specific action.
- The middleware protects page rendering.
- API routes repeat authorization and must not rely on middleware alone.

## Session model

The application has one shared password for members and one shared password for administrators.

1. A password form posts to `/api/auth/login` or `/api/auth/admin-login`.
2. The server checks configuration and Firestore-backed rate limiting.
3. It verifies the password with a constant-time SHA-256 comparison.
4. It creates an HMAC-signed JWT-like token.
5. The token contains `sub` (`member` or `admin`) and a password-version claim.
6. The server stores the token in an HttpOnly cookie:
   - `sw_auth` for members
   - `sw_admin` for administrators
7. Middleware and API helpers verify the signature, role, expiration, and password version.

Member sessions last 30 days. Admin sessions last 8 hours.

This is role access, not individual user identity or public member profiles.

## Password rotation

`lib/session-version.ts` derives a password-version claim from `AUTH_SECRET`, role, and the current password. Existing sessions become invalid if that password or secret changes.

The Edge-compatible counterpart in `lib/session-version-edge.ts` performs the equivalent operation for middleware.

## Protected pages

Middleware protects `/care`, `/archive`, `/bulletin`, `/calendar`, `/chat`, `/ai-chat`, `/community`, `/community-agreement`, and `/shop` for member or admin access.

`/admin` requires the admin cookie.

Legacy routes redirect to canonical routes. The canonical destinations remain protected by middleware.

## Protected API checks

Examples:

- Member/admin reads: `requireMemberOrAdmin()`
- Admin writes: `requireAdmin()`
- Session information: `getServerSession()`
- Upload folders: `getServerSession()` plus folder-specific admin checks
- Storage reads: session required plus allowlisted path and content validation

## Important security mechanisms

| Mechanism | Location | Purpose |
|---|---|---|
| HttpOnly cookies | login routes | Prevent normal browser JavaScript from reading session tokens |
| SameSite=Lax | login routes | Limit cross-site credential behavior |
| Secure cookies in production | login routes | Restrict cookies to HTTPS |
| Password-version claims | `lib/session-version*` | Revoke sessions after password or secret changes |
| Login rate limit | `lib/login-rate-limit.ts` | Limit attempts through Firestore |
| Server-derived sender labels | messages and replies routes | Prevent client impersonation |
| Server-owned upload paths | post route and upload route | Prevent arbitrary file path selection |
| Upload allowlists | `lib/upload-constraints.ts` | Limit size and media types |
| Private storage URLs | `/api/storage` | Require signed session before media download |
| Archive allowlist | `/api/archive-media/[filename]` | Only expose named archive files |
| CSP and security headers | `next.config.mjs` | Frame, content, image, and script restrictions |
| Prompt guardrails | `lib/ai-chat.ts` | Mitigation for AI output; not a verified safety guarantee |

## Known limitations

- Shared-password sessions do not identify individuals.
- Chat content is not end-to-end encrypted.
- Every signed-in chat user can derive the shared room key.
- Mistral receives submitted text in plaintext and this is not an encryption boundary.
- Stored Storage objects may include legacy publicly accessible objects.
- Firestore live rules, IAM, and production ACLs are unverified.
- Login throttling depends on Firestore availability and a trusted proxy address.
- The deployment secret-storage model is unresolved in the repository.
