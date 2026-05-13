## Summary

<!-- Short description of what changed and why. -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Docs / copy / SEO only
- [ ] Refactor / chore

## Checklist

- [ ] Branch is up to date with `main` (`git fetch origin && git merge origin/main` or rebase)
- [ ] **`CI` GitHub Actions** completes on this PR (TypeScript + Next build — no `.env.local` required)
- [ ] If **Vercel Preview** stays red while GitHub Actions is green: fix **Preview `DATABASE_URL`** (must be Postgres **reachable from the internet**, not Render’s internal `dpg-*-a` hostname). Production env can differ from Preview — set **both**, or omit `DATABASE_URL` on Preview only if migrations aren’t needed for branch deploys
- [ ] `npm run lint` (= `tsc --noEmit`) and `npm run build` pass locally before opening the PR
- [ ] **Vercel / Render:** `DATABASE_URL` is the **external** Postgres URL for Production + Preview (internal `dpg-*-a` hosts fail from Vercel)
- [ ] **Clerk:** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` set on each host; dashboard paths match `/sign-in` and `/sign-up`; custom domain verified if used
- [ ] No secrets committed (`.env.local` stays local; only `.env.example` placeholders updated if needed)
- [ ] UI checked on a narrow viewport if the change touches layout
- [ ] If landing or workspace entry changed: guests can still use **Sign in** / **Create account** in the left rail (open **Desks** menu on mobile)

## Screenshots / notes

<!-- Optional: before/after, or deployment notes for Render / cron / env vars. -->
