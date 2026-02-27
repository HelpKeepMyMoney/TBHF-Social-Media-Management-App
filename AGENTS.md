# AGENTS.md

## Cursor Cloud specific instructions

### Overview

TBHF Social Studio is a single Next.js 15 application (App Router) — not a monorepo. It serves both frontend (React/TypeScript/Tailwind) and backend (API routes). All data lives in Firebase (Firestore + Auth); there are no local databases or Docker containers.

### Running the dev server

```bash
npm run dev
```

The app runs on `http://localhost:3000`. It requires a `.env.local` file (see `.env.local.example` for the template). Without real Firebase credentials the login page renders but authentication will fail.

### Lint / Build / Test

- **Lint:** `npm run lint` — runs ESLint via Next.js. Expect 2 non-blocking warnings (missing alt prop, missing hook dependency).
- **Build:** `npm run build` — currently produces type errors because the repo's API route handlers use synchronous `params` (Next.js 14 style) while Next.js 15 requires `Promise<{ id: string }>`. This is a known issue; the dev server works fine because it doesn't enforce strict type checking.
- **Tests:** No automated test suite exists in this repo.

### Dependency notes

- The repo's `package.json` originally pinned `next@14.2.16`, but `next.config.ts` and `serverExternalPackages` require Next.js 15+. The dependency was upgraded to `next@15.0.0` during setup.
- `@vercel/blob` and `@aws-sdk/client-s3` are imported in `src/lib/storage/index.ts` but were not listed in `package.json`. They were installed as runtime dependencies.

### External service requirements

Firebase Auth + Firestore credentials are **required** for any authenticated flow. AI APIs (Anthropic, OpenAI) and media storage (Vercel Blob / S3 / R2) are optional — the app runs without them but those features will error.
