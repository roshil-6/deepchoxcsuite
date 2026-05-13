# PR deployment checklist — single Vercel project

Use this list when merging to `main` or before asking for Production approval. Paste the **Deploy verification** section into the PR description or tick items in review comments.

## One Vercel project (recommended)

- [ ] **Project** pulls from the right repo and default branch (`main`).
- [ ] **Build command** respects `vercel.json` (`npm run build:vercel` runs Prisma migrations when `DATABASE_URL` is present, then `next build`).
- [ ] **Production** deployment target is Production; PRs receive **Preview** URLs.

## External Postgres (`DATABASE_URL`) — Production + Preview

- [ ] **Production** env has **`DATABASE_URL`** = URL your host can reach on the **public internet**.
- [ ] **Preview** env either:
  - [ ] Uses the **same external** Postgres (simplest), or
  - [ ] A **separate** preview/staging Postgres (also externally reachable), or
  - [ ] Is **unset**: build skips migrate with a warning; only use if you do not need DB-backed routes on previews.
- [ ] **Never** rely on Render’s **internal** host pattern `dpg-*-a` (no dots) — Vercel cannot reach it (`P1001` / connection refused). Use Render’s **External** Database URL (`*.render.com` / public hostname).
- [ ] After merge: confirm **migrate** succeeded in Production build logs (`prisma migrate deploy`) when migrations were added in the PR.

## Clerk (auth)

- [ ] **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`** and **`CLERK_SECRET_KEY`** set on Vercel for **Production** and **Preview** (if previews need sign-in).
- [ ] Dashboard allows your sign-in/up URLs (`/sign-in`, `/sign-up`) and domains (production + Preview `*.vercel.app` if used).

## GitHub Actions vs Vercel

- [ ] **GitHub Actions `CI`** (`.github/workflows/ci.yml`) green: `npm ci`, `prisma generate`, `npm run lint` (= `tsc --noEmit`), `npm run build`.
- [ ] **Vercel** red **with CI green**: almost always **`DATABASE_URL` on Preview**, wrong host, or missing migrate permissions — not necessarily code.

## Smoke test after Production deploy

- [ ] Homepage loads (`/`).
- [ ] `/sign-in`, `/sign-up` load without runtime errors from missing Clerk vars.
- [ ] Critical API route you touched returns **healthy** (`/api/health` where applicable).

## Smoke test on Preview (optional)

- [ ] Preview URL builds and loads first paint.
- [ ] If previews use DB: one read/write flow you touched still works.

## Rollback

- [ ] Know how to **redeploy previous Production deployment** from Vercel dashboard if needed.
