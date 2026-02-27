# TBHF Social Studio

**Internal social media management platform for nonprofit campaign coordination.**

> An AI-powered, role-gated web application for planning campaigns, creating content, scheduling posts, tracking engagement, and generating board-ready reports.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Database | Firebase Firestore |
| Authentication | Firebase Auth |
| AI – Text | Anthropic Claude (`claude-opus-4-6`) |
| AI – Image | OpenAI DALL-E 3 |
| AI – Video | Pika Labs (Phase 2) |
| Media Storage | Pluggable: Vercel Blob / AWS S3 / Cloudflare R2 |
| Charting | Recharts |
| Calendar | React Big Calendar |
| PDF Export | jsPDF + jsPDF-AutoTable |
| CSV Export | PapaParse |

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/         # Login page
│   ├── (dashboard)/          # Protected dashboard routes
│   │   ├── page.tsx          # Overview / main dashboard
│   │   ├── campaigns/        # Campaign management
│   │   ├── ai-studio/        # AI content creation (text, image, video)
│   │   ├── posts/            # Post composer & list
│   │   ├── calendar/         # Calendar view of scheduled posts
│   │   ├── analytics/        # Engagement & impact tracking
│   │   ├── reports/          # Board PDF/CSV reports
│   │   └── settings/         # User & system settings
│   └── api/
│       ├── ai/               # Claude text + DALL-E image + Pika video
│       ├── campaigns/        # Campaign CRUD
│       ├── posts/            # Post CRUD
│       ├── analytics/        # Analytics & impact metrics
│       ├── media/upload/     # File upload handler
│       ├── reports/export/   # Report generation (JSON/CSV)
│       └── users/            # User profile management
├── components/
│   ├── layout/               # Sidebar, Header
│   └── ui/                   # Button, Card, Modal, Badge, Toast, LoadingSpinner
├── hooks/                    # useAuth, useCampaigns, usePosts, useAnalytics, useApi
├── lib/
│   ├── ai/                   # claude.ts, dalle.ts, pika.ts
│   ├── auth/middleware.ts    # JWT verification + role enforcement
│   ├── firebase/             # client.ts (browser), admin.ts (server-only)
│   ├── storage/              # Pluggable media storage abstraction
│   └── utils/                # Formatting, rate limiting, audit logging
└── types/index.ts            # All shared TypeScript types
firestore.rules               # Firestore security rules
.env.local.example            # Environment variable template
```

---

## User Roles

| Role | Permissions |
|---|---|
| **Admin** | Full access: campaigns, posts, AI Studio, analytics, reports, settings, user management |
| **Staff** | Create/edit campaigns, create/edit own posts, use AI Studio, view analytics |
| **Board** | Read-only: analytics, reports |

Roles are stored in Firestore and enforced server-side on every API route.

---

## Setup Instructions

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd TBHF-Social-Media-Management-App
npm install
```

### 2. Configure Environment

```bash
cp .env.local.example .env.local
```

Fill in all values in `.env.local`:

**Firebase (Client)**
1. Go to [Firebase Console](https://console.firebase.google.com) → Your Project → Project Settings → General → Your apps
2. Copy the `firebaseConfig` values to the `NEXT_PUBLIC_FIREBASE_*` variables

**Firebase Admin**
1. Firebase Console → Project Settings → Service accounts → Generate new private key
2. Copy `project_id` → `FIREBASE_PROJECT_ID`
3. Copy `client_email` → `FIREBASE_CLIENT_EMAIL`
4. Copy `private_key` → `FIREBASE_PRIVATE_KEY` (keep the `\n` newlines as-is)

**AI APIs**
- `ANTHROPIC_API_KEY`: [console.anthropic.com](https://console.anthropic.com)
- `OPENAI_API_KEY`: [platform.openai.com](https://platform.openai.com)
- `PIKA_API_KEY`: (Phase 2 — request access from Pika Labs)

**Media Storage** — pick one:

*Option A: Vercel Blob*
```
STORAGE_PROVIDER=vercel-blob
BLOB_READ_WRITE_TOKEN=<from Vercel dashboard>
```

*Option B: AWS S3*
```
STORAGE_PROVIDER=s3
STORAGE_BUCKET=your-bucket-name
STORAGE_REGION=us-east-1
STORAGE_ACCESS_KEY_ID=...
STORAGE_SECRET_ACCESS_KEY=...
```

*Option C: Cloudflare R2*
```
STORAGE_PROVIDER=r2
STORAGE_BUCKET=your-bucket-name
STORAGE_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
STORAGE_ACCESS_KEY_ID=...
STORAGE_SECRET_ACCESS_KEY=...
```

### 3. Configure Firebase

**Enable Email/Password Authentication:**
Firebase Console → Authentication → Sign-in method → Email/Password → Enable

**Deploy Firestore Security Rules:**
```bash
# Install Firebase CLI if needed
npm install -g firebase-tools
firebase login
firebase init firestore
firebase deploy --only firestore:rules
```

**Create the first Admin user:**
1. Firebase Console → Authentication → Add user (enter email/password)
2. Firebase Console → Firestore → `users` collection → Add document
   - Document ID: the UID from step 1
   - Fields: `name` (string), `email` (string), `role` = `"admin"`, `createdAt` (ISO string)

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) and sign in with the admin account.

---

## Deployment (Vercel — Recommended)

### 1. Push to GitHub

```bash
git remote add origin <your-github-repo>
git push -u origin main
```

### 2. Import to Vercel

1. [vercel.com/new](https://vercel.com/new) → Import repository
2. Framework: **Next.js** (auto-detected)
3. Root directory: `/` (default)

### 3. Add Environment Variables

In Vercel project → Settings → Environment Variables, add all variables from `.env.local.example`.

> **Important:** `FIREBASE_PRIVATE_KEY` must be added with the literal `\n` characters preserved. Paste it exactly as it appears in the JSON file.

### 4. Deploy

Vercel auto-deploys on every push to `main`. Preview deployments are created for PRs.

---

## Firestore Indexes

The following composite indexes are required. Create them in Firebase Console → Firestore → Indexes:

| Collection | Fields | Order |
|---|---|---|
| `posts` | `campaignId ASC`, `scheduledTime ASC` | Composite |
| `posts` | `status ASC`, `scheduledTime ASC` | Composite |
| `analytics` | `campaignId ASC`, `date ASC` | Composite |
| `audit_logs` | `userId ASC`, `createdAt DESC` | Composite |

Firebase will also prompt you to create indexes when they're needed at runtime — follow the link in the error message.

---

## AI Usage & Rate Limiting

All AI API calls are **server-side only**. API keys are never exposed to the browser.

| Feature | Rate Limit | Configurable |
|---|---|---|
| Text generation (Claude) | 20 req/min/user | `AI_RATE_LIMIT_RPM` env var |
| Image generation (DALL-E 3) | 10 req/min/user | Hardcoded in route |
| Video generation (Pika) | 5 req/min/user | Hardcoded in route |

All AI generations are logged to the `ai_generations` Firestore collection.

---

## Security Checklist

- [x] Claude/OpenAI/Pika API keys are server-side only (Next.js API routes)
- [x] Firebase Auth ID token verified on every API request
- [x] Role-based access enforced server-side (not just client-side)
- [x] Firestore Security Rules deployed
- [x] File upload validation (type allowlist + 50 MB size limit)
- [x] AI usage rate limiting per user per minute
- [x] Audit logging for all sensitive operations
- [x] `robots.txt` / metadata configured to prevent public indexing

---

## Phase 2 Roadmap

- [ ] Pika Labs video generation (API key required)
- [ ] Enhanced analytics with campaign comparison charts
- [ ] Automated posting via platform APIs (Meta, LinkedIn, X)
- [ ] AI content approval workflow
- [ ] Email digest for board members
- [ ] Advanced audit log viewer in Settings

---

## Support

For internal support, contact your organization's technology administrator.
For bugs or feature requests, open an issue in this repository.
