# actorslines.app

Website for **Actors Lines**, the on-device rehearsal companion for actors
(Android). Marketing site, members' knowledge base, and a community
enhancement-request pipeline backed by AI triage.

- **Frontend**: React + Vite + TypeScript + Tailwind, hosted on Cloudflare Pages.
- **Backend**: Supabase (auth incl. TOTP 2FA, Postgres with row-level security,
  edge functions).
- **AI pipeline**: GitHub Actions in the (private) ActorsVoice app repository run
  Claude Code to triage requests, write implementation plans, and open PRs.

## First-time setup

Everything you need to stand this up — accounts, keys, DNS — is in **[SETUP.md](SETUP.md)**,
written to be followed step by step.

## Day-to-day

```bash
npm install        # once
npm run dev        # local dev server (needs .env — see SETUP.md S2)
npm run build      # production build (what CI and Cloudflare run)
```

- **Add a knowledge-base article**: create `src/content/kb/<slug>.md` with
  `title`/`summary`/`date` front-matter, write markdown, push. A YouTube link on
  its own line becomes an embedded player.
- **Database changes**: add a new file in `supabase/migrations/`, then
  `supabase db push`.
- **Edge functions**: edit under `supabase/functions/`, then
  `supabase functions deploy <name>`.

## Structure

```
src/pages/…          screens (auth, kb, requests, board, admin)
src/auth/            session + 2FA context and route guards
src/lib/             supabase client, types, kb loader
src/content/kb/      knowledge-base articles (markdown)
supabase/migrations/ database schema + row-level security
supabase/functions/  dispatch (GitHub bridge), lifecycle (inactivity policy)
.github/workflows/   CI build + daily lifecycle/keep-alive
```
