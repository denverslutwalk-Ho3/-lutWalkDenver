# Feature Inventory

## Public landing and information

| Feature | Route | UI | API/dependency | Auth | Storage/data | Tests | Status |
|---|---|---|---|---|---|---|---|
| Landing | `/` | `app/page.tsx` | shared layout only | No | None | Public-page E2E, responsive, accessibility | Implemented |
| About/donate | `/about`, `/donate` | corresponding pages | `lib/site.ts` | No | None | Browser suites | Implemented |
| Policies | `/privacy`, `/terms`, `/accessibility` | corresponding pages | Static content | No | None | Browser suites | Implemented |

## Authentication

| Feature | Route | UI | API | Auth/admin | Storage/data | Tests | Status |
|---|---|---|---|---|---|---|---|
| Member login | `/login` | `PasswordForm` | `/api/auth/login` | Public | Signed JWT cookie, HMAC password version, Firestore rate-limit | Unit and E2E | Implemented; live Firebase rate limiter unverified |
| Admin login | `/admin-login` | `PasswordForm` | `/api/auth/admin-login` | Public | Separate admin JWT cookie | Unit and E2E | Implemented |
| Session lookup/logout | `/api/auth/session`, `/api/auth/logout`, `/api/auth/admin-logout` | Header/login/logout controls | Auth APIs | Signed cookies | No Firestore | Unit/browser | Implemented |

The shared-password model represents a role, not an individual identity.

## Member features

| Feature | Route | API | Database/storage | Admin? | Tests | Status |
|---|---|---|---|---|---|---|
| Bulletin | `/bulletin` | `/api/posts`, `/api/posts/[id]`, replies, reports | `posts`, `replies`, `reports`, optional Storage | Member reads/posts; admin edits/deletes/pins | Unit and browser route coverage | Implemented |
| Persistent discussion | `/bulletin/[id]` | post and reply APIs | `posts`, `replies` | Member reads/posts; admin deletes | Unit coverage for underlying APIs | Implemented in source; browser coverage partial |
| Community agreement | `/community-agreement` | `/api/community-agreement` | `communityAgreementAcceptances` | Member/admin | Unit or browser not meaningful without Firebase | Implemented |
| Chat | `/chat` | `/api/messages`, `/api/messages/key` | `messages`, derived room key | Member/admin | Unit and browser | Implemented; not end-to-end encryption |
| Calendar | `/calendar` | `/api/events`, `/api/events/[id]/rsvp` | `events.rsvps` | Any signed role can RSVP; only admin edits | Unit and browser | Implemented |
| Community gallery | `/community` | `/api/gallery` | `galleryAssets`, Storage | Admin uploads; members read | Browser route; live storage unverified | Implemented |
| Archive | `/archive` | `/api/gallery`, `/api/archive-media/[filename]` | Static assets outside `public/`, uploaded gallery assets | Admin uploads; members read | Browser and responsive/accessibility | Implemented |
| AI chat | `/ai-chat` | `/api/ai-chat`, `/api/ai-agents` | `aiAgents`, external Mistral | Members chat; admins manage prompts | Unit and route mocks | Implemented; live Mistral unverified |
| Consolidated care | `/care` | Links to bulletin/chat/calendar/archive/community/store | Mostly static content | Member | Accessibility/responsive/browser | Implemented, with some historical content omitted |

## Admin features

| Feature | Dashboard section | API | Database/storage | Tests |
|---|---|---|---|---|
| Event management | Admin page | `/api/events`, `/api/events/[id]` | `events` | Unit and browser |
| Event archiving | Admin page | `/api/events/[id]` | `events.archived` | Unit |
| Post moderation | Admin page | `/api/posts/[id]` | `posts`, reply subcollections, Storage | Unit |
| Reply moderation | Admin page | `/api/posts/[id]/replies/[replyId]` | reply subcollection | Unit |
| Report moderation | Admin page | `/api/reports`, `/api/reports/[id]` | `reports`, audit subcollection | Unit |
| Product management | Admin page | `/api/products`, `/api/products/[id]`, `/api/upload` | `products`, Storage | Unit |
| Gallery management | Admin page | `/api/gallery`, `/api/gallery/[id]`, `/api/upload` | `galleryAssets`, Storage | Unit |
| AI assistant management | Admin page | `/api/ai-agents`, `/api/ai-agents/[id]` | `aiAgents` | Unit |

## Zines and shop

- Zines are now surfaced from `/shop`.
- The store supports product categories including `zines`.
- Zine submissions and PDF-access information are included in the shop page.
- `/zines` and `/zine.html` redirect to `/shop`.
- Five PDF assets exist under `assets/community-media/zines/`, but no current page directly references them.

Status: **Partially consolidated and content-not-fully-preserved**. The original standalone zines page and historical education content should be compared for copy-level completeness.
