# AI Slop and Technical Debt Register

This register contains potential cleanup opportunities only. It does not authorize removal or rewriting.

| Path | Finding | Evidence | Impact | Action | Risk |
|---|---|---|---|---|---|
| `app/care/page.tsx` | Consolidation may have omitted historical education and organizer guidance | Original route files contained a timeline and final organizer-contact section | User-facing content loss | Consolidate | Medium |
| `app/shop/page.tsx` | Zines were merged into the store but only some standalone copy was retained | Original zine page had distinct headline and detailed support information | Partial behavior/content change | Consolidate and restore missing copy | Medium |
| `app/admin/page.tsx` | One large component manages events, posts, products, gallery, reports, and assistants | 1000+ lines and multiple independent fetch/form handlers | Maintenance and test isolation difficulty | Preserve now; split only with a demonstrated need | Medium |
| `app/bulletin/page.tsx` | Large discussion component combines list, categories, search, posting, replies, and reports | Many independent state and fetch responsibilities | Difficult but functionally complete | Preserve; consider targeted sections later | Medium |
| `lib/auth.ts` + `lib/auth-edge.ts` | Separate implementations exist | Node and Edge-compatible runtimes require different crypto APIs | Duplicate code but runtime boundaries justify it | Preserve | Low |
| `lib/session-version.ts` + `lib/session-version-edge.ts` | Separate session-version implementations | Middleware and server runtime use different crypto APIs | Duplicate logic but small and necessary | Preserve | Low |
| `lib/ai-chat.ts` | `SYSTEM_PROMPT` appears exported primarily for tests | Search found no production consumer | Potential dead export | Investigate before removal | Low |
| `assets/community-media/zines/` | Five PDFs are not referenced by source | No route/page string references found | Possible abandoned content | Investigate with content owner | Low |
| `APIFY_API_TOKEN` | Environment/deployment documentation reserves an unused value | No source route reads it | Configuration noise | Preserve until Apify integration is decided | Low |
| `amplify.yml` / deployment docs | Conflict with README about intended hosting | README says intended host is Apify while runbook/Amplify describe AWS | Deployment ambiguity | Separate future infrastructure decision | High |
| `docs/deployment-runbook.md` | Deployment runbook documents known blockers | Hosting, secrets, Firebase, Storage, and DNS are unverified | Could be mistaken for deployment readiness | Preserve and update only with owner evidence | High |
| Public-page legacy `.html` redirects | Intentional backward compatibility | Redirect table is explicit | Extra entries but meaningful compatibility | Preserve | Low |
| `next.config.source.mjs` | Empty, unreferenced file | Diff removes it cleanly | Previously no impact | Safe remove already identified | Low |

## Duplicate implementations

- Shared session logic has Node and Web Crypto variants for server and middleware boundaries.
- Login routes separately implement member/admin flows because they use different password, cookie, and expiration settings.
- Storage validation has separate route and helper logic for different boundaries.

These are not automatically unnecessary; removing them would require preserving each runtime and validation boundary.

## Highest-risk future simplifications

1. Do not remove authentication helpers or middleware checks.
2. Do not collapse member/admin sessions into one public identity model.
3. Do not move Firebase credentials into browser code.
4. Do not make archive or uploaded Storage objects public.
5. Do not remove compatibility redirects without external URL verification.
6. Do not remove Firestore login-rate-limit handling without replacing it.
