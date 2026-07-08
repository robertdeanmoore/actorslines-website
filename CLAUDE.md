# CLAUDE.md

Website for the Actors Lines Android app (repo: `../ActorsVoice`). React + Vite + TS +
Tailwind SPA on Cloudflare Pages; Supabase backend (auth with TOTP 2FA, Postgres + RLS,
edge functions); AI pipeline runs as GitHub Actions in the ActorsVoice repo.

- **The setup state of truth** is `SETUP.md` (which external services are wired yet) and
  `docs/plans/actorslines-website-progress.md` in the ActorsVoice repo (what's built/pending).
- **DB changes**: new numbered file in `supabase/migrations/` (never edit an applied one),
  then `supabase db push`. Keep RLS in mind: `ai_reports`/`dev_notes`/`plans` are admin-only;
  the board view `board_posts_with_stats` is deliberately security-definer.
- **KB articles**: `src/content/kb/<slug>.md` with `title`/`summary`/`date` front-matter. A
  bare YouTube link on its own line renders as an embed.
- **KB articles mirrored from the app's in-app help**: 14 articles under `src/content/kb/`
  (as of 8 Jul 2026) are word-for-word mirrors of an article in ActorsVoice's
  `HelpManual.kt`, matched **by slug/id** — e.g. `src/content/kb/selftape.md` mirrors
  `HelpManual.SELFTAPE`. This is intentional and the pairing is deliberately just the shared
  filename, no automated sync exists. **When you edit a `HelpManual.kt` article, also update
  the matching KB file here in the same piece of work** (translate `B.h`→`##`, `B.p`→a plain
  paragraph, `B.b`→a `-` list item, `B.tip`→a `> **Tip:** …` blockquote); conversely, if you
  add a brand-new KB article that has no in-app equivalent, it's not part of this mirror and
  doesn't need a HelpManual counterpart. Not every HelpManual article needs a KB one either —
  only keep the two in sync where a KB file with that slug already exists.
- **Statuses**: request lifecycle enum in `src/lib/types.ts` mirrors `request_status` in SQL —
  change both together (plus the workflows that PATCH statuses).
- **Workflows**: `dispatch` edge function ↔ `repository_dispatch` event names ↔
  `.github/workflows/*.yml` in ActorsVoice must stay in sync (`triage-report`,
  `implementation-plan`, `implement-pr`).
- Build check: `npm run build` (CI runs the same).
