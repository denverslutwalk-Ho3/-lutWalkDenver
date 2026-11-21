# Database and Data-Flow Reference

## Database implementation

The application uses Cloud Firestore through the Firebase Admin SDK. There is no Firebase client SDK in the repository. The database helper is [lib/firebase-admin.ts](../../lib/firebase-admin.ts).

Live project access, collections, and stored records are not verified by local tests.

## Collections

| Collection | Used for | Main fields visible in source | Readers/writers |
|---|---|---|---|
| `posts` | Bulletin discussions | `title`, `text`, `category`, `pinned`, `reactions`, `replyCount`, `lastActivityAt`, `imageUrl`, `storagePath`, timestamps | `/api/posts*` |
| `posts/{id}/replies` | Replies to a post | `text`, `sender`, `createdAt` | `/api/posts/[id]/replies*` |
| `messages` | Shared chat records | `sender`, `text`, `encrypted`, `createdAt` | `/api/messages*` |
| `events` | Calendar events and RSVP state | `title`, `date`, `time`, `location`, `description`, `archived`, `rsvps`, `createdAt` | `/api/events*` |
| `products` | Store items | `name`, `description`, `price`, `stock`, `category`, `imageUrl`, `storagePath`, timestamps | `/api/products*` |
| `galleryAssets` | Community/archive gallery metadata | `title`, `description`, `collection`, `category`, `imageUrl`, `storagePath`, `contentType`, `createdAt` | `/api/gallery*` |
| `aiAgents` | Admin-managed assistant definitions | `name`, `description`, `systemPrompt`, `createdAt`, `updatedAt` | `/api/ai-agents*`, `/api/ai-chat` |
| `reports` | Content reports | `targetType`, `targetId`, `parentPostId`, `reason`, `details`, `status`, `resolutionNotes`, `reporterRole`, timestamps | `/api/reports*` |
| `reports/{id}/audit` | Report status-change history | `action`, `actorRole`, status transitions, timestamps | `/api/reports*` |
| `communityAgreementAcceptances` | Role-only agreement acceptance | `role`, `accepted`, `acceptedAt`, `agreementVersion` | `/api/community-agreement` |
| `internal_login_rate_limits` | Login attempt throttling | HMAC-derived address identifier, attempt count, window and expiry fields | `lib/login-rate-limit.ts`, login routes |

Field names not shown above should not be assumed to exist unless evidenced in a route or helper.

## Data flows

### Bulletin post

```text
Member/admin form
→ app/bulletin/page.tsx
→ POST /api/posts
→ session check and input validation
→ optional post-specific Firebase Storage upload
→ Firestore posts document
→ response and local page reload
```

Post deletion removes an owned post image, reply subdocuments, and the post document. Legacy shared `posts/` objects are not treated as owner-specific.

### Reply

```text
Member/admin reply form
→ POST /api/posts/[id]/replies
→ session-derived sender role
→ Firestore transaction
→ reply subdocument and post counters
→ refresh post/replies
```

The sender is derived from the signed session role, not accepted as a client-supplied sender.

### Event RSVP

```text
Calendar selection
→ POST /api/events/[id]/rsvp
→ signed role identifies member or admin
→ transaction normalizes legacy RSVP arrays
→ events/{id}.rsvps.member or .admin
```

This does not create individual participant identities.

### Media upload

```text
Admin/member upload form
→ POST /api/upload or post-specific direct upload
→ server role and folder check
→ size/type validation
→ server-generated storage path
→ Firebase Storage save
→ same-origin /api/storage URL
→ metadata document
→ authenticated stream through /api/storage
```

New storage objects are intentionally private. Archive static assets use a separate local authenticated route.

### Report

```text
Member/admin report form
→ POST /api/reports
→ target existence check
→ reports document
→ reports/{id}/audit submitted event
→ admin PATCH status
→ audit status_changed event
```

### Agreement

```text
Member/admin page
→ accepted=true
→ POST /api/community-agreement
→ communityAgreementAcceptances document with role and version
```

No public member profile or individual identity is stored in this flow.
