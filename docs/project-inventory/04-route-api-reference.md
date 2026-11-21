# Route and API Reference

## User-facing routes

### Public

| Route | Page | Notes |
|---|---|---|
| `/` | `app/page.tsx` | Landing cards |
| `/about` | `app/about/page.tsx` | Organization information |
| `/donate` | `app/donate/page.tsx` | Donation and support links |
| `/privacy` | `app/privacy/page.tsx` | Privacy policy |
| `/terms` | `app/terms/page.tsx` | Terms |
| `/accessibility` | `app/accessibility/page.tsx` | Accessibility statement |
| `/login` | `app/login/page.tsx` | Member password |
| `/admin-login` | `app/admin-login/page.tsx` | Admin password |

### Member or admin

| Route | Page | Page guard |
|---|---|---|
| `/care` | `app/care/page.tsx` | Member or admin |
| `/archive` | `app/archive/page.tsx` | Member or admin |
| `/bulletin` | `app/bulletin/page.tsx` | Member or admin |
| `/bulletin/[id]` | `app/bulletin/[id]/page.tsx` | Member or admin |
| `/calendar` | `app/calendar/page.tsx` | Member or admin |
| `/chat` | `app/chat/page.tsx` | Member or admin |
| `/ai-chat` | `app/ai-chat/page.tsx` | Member or admin |
| `/community` | `app/community/page.tsx` | Member or admin |
| `/community-agreement` | `app/community-agreement/page.tsx` | Member or admin |
| `/shop` | `app/shop/page.tsx` | Member or admin |

### Admin only

| Route | Page | Guard |
|---|---|---|
| `/admin` | `app/admin/page.tsx` | `sw_admin` cookie and admin role |

### Redirects

| Source | Destination |
|---|---|
| `/education`, `/education.html`, `/organizing`, `/organizing.html` | `/care` |
| `/zines`, `/zine.html` | `/shop` |
| `/events` | `/calendar` |
| `/shop/success` | `/donate` |
| `/chatroom-spec` | `/chat` |
| Legacy `.html` routes | Their App Router equivalents |

## API endpoints

### Authentication

| Endpoint | Methods | Purpose | Auth | Storage | Tests |
|---|---|---|---|---|---|
| `/api/auth/login` | POST | Verify member password, set member cookie | Public | Firestore login-rate-limit, signed JWT | Unit/E2E |
| `/api/auth/admin-login` | POST | Verify admin password, set admin cookie | Public | Firestore login-rate-limit, signed JWT | Unit/E2E |
| `/api/auth/logout` | POST | Clear member cookie | Public | Cookie | E2E |
| `/api/auth/admin-logout` | POST | Clear admin cookie | Public | Cookie | E2E |
| `/api/auth/session` | GET | Return current role | Signed session | No database | Unit/E2E |

### Bulletin

| Endpoint | Methods | Purpose | Auth | Data operations | Tests |
|---|---|---|---|---|---|
| `/api/posts` | GET, POST | List/search/create posts | GET/POST member or admin | `posts`; optional Storage upload | Unit |
| `/api/posts/[id]` | GET, DELETE, PATCH | Load/delete/update post | GET signed; DELETE/PATCH admin | `posts`, replies, Storage cleanup | Unit |
| `/api/posts/[id]/replies` | GET, POST | List/create replies | Signed for both | `posts/[id]/replies` | Unit |
| `/api/posts/[id]/replies/[replyId]` | DELETE | Delete reply | Admin | Reply document | Unit |

POST validation includes text lengths, category allowlists, upload size/type limits, and server-owned post image paths.

### Events

| Endpoint | Methods | Purpose | Auth | Data |
|---|---|---|---|---|
| `/api/events` | GET, POST | List/create events | GET signed; POST admin | `events` |
| `/api/events/[id]` | DELETE, PATCH | Delete/archive/edit event | Admin | `events/[id]` |
| `/api/events/[id]/rsvp` | POST | Idempotently set role RSVP | Member or admin | `events/[id].rsvps.member/admin` |

### Gallery and uploads

| Endpoint | Methods | Purpose | Auth | Data |
|---|---|---|---|---|
| `/api/gallery` | GET, POST | List/create gallery metadata | GET signed; POST admin | `galleryAssets`, Storage URLs |
| `/api/gallery/[id]` | DELETE | Delete gallery asset | Admin | Metadata and referenced Storage object |
| `/api/upload` | POST | Upload private file | Signed; archive/community/products require admin | Firebase Storage |
| `/api/storage` | GET | Stream authorized private file | Signed member or admin | Firebase Storage |
| `/api/archive-media/[filename]` | GET | Stream allowlisted static archive file | Signed member or admin | Local `assets/community-media/archive` |

### Chat and agreements

| Endpoint | Methods | Purpose | Auth | Data |
|---|---|---|---|---|
| `/api/messages` | GET, POST | Read/send chat messages | Member or admin | `messages` |
| `/api/messages/key` | GET | Return shared room key derived from auth secret | Member or admin | `AUTH_SECRET` derived key |
| `/api/community-agreement` | POST | Record role and agreement version acceptance | Member or admin | `communityAgreementAcceptances` |

### Reports

| Endpoint | Methods | Purpose | Auth | Data |
|---|---|---|---|---|
| `/api/reports` | GET | List reports | Admin | `reports` |
| `/api/reports` | POST | Submit a report for a post/reply | Member or admin | `reports`, audit subcollection |
| `/api/reports/[id]` | PATCH | Change report status and resolution | Admin | `reports`, audit subcollection |

### Store

| Endpoint | Methods | Purpose | Auth | Data |
|---|---|---|---|---|
| `/api/products` | GET, POST | List/create products | GET signed; POST admin | `products`, Storage |
| `/api/products/[id]` | DELETE, PATCH | Delete/update products | Admin | `products`, Storage cleanup |

### AI

| Endpoint | Methods | Purpose | Auth | Data/external service |
|---|---|---|---|---|
| `/api/ai-agents` | GET, POST | List/create assistants | GET signed; POST admin | `aiAgents` |
| `/api/ai-agents/[id]` | PATCH, DELETE | Edit/delete assistant | Admin | `aiAgents` |
| `/api/ai-chat` | POST | Validate history and call Mistral | Member or admin | `aiAgents`, Mistral API |
