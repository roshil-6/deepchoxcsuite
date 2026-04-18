## Summary

<!-- Short description of what changed and why. -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Docs / copy / SEO only
- [ ] Refactor / chore

## Checklist

- [ ] `npm run build` passes locally
- [ ] Prisma: migrations run where needed (`npm run db:migrate` against the right `DATABASE_URL`)
- [ ] **Vercel:** only **one** project has this GitHub repo connected (extra projects duplicate checks & env — disconnect Git on unused projects)
- [ ] **Vercel:** `DATABASE_URL` is the Postgres **external** URL for **Production** and **Preview** (Render internal `dpg-*-a` hosts are unreachable from Vercel)
- [ ] **Vercel:** `NEXT_PUBLIC_SITE_URL` matches the production domain (canonical + Open Graph)
- [ ] No secrets committed (`.env.local` stays local; only `.env.example` placeholders updated if needed)
- [ ] UI checked on a narrow viewport if the change touches layout

## Screenshots / notes

<!-- Optional: before/after, or deployment notes for Render / cron / env vars. -->
