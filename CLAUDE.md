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
- **Every KB article must mirror an in-app Help article, word-for-word — full parity, not a
  subset.** Matched **by slug/id**: `src/content/kb/<slug>.md` mirrors
  `HelpManual.<CONST>` in the ActorsVoice repo wherever `HelpManual.<CONST> = "<slug>"` (e.g.
  `src/content/kb/selftape.md` ↔ `HelpManual.SELFTAPE`). No automated sync exists — the
  pairing is the shared filename, kept in sync by hand. **Whenever a `HelpManual.kt` article
  is added or edited, add or update the matching KB file in the same piece of work**
  (translate `B.h`→`##`, `B.p`→a plain paragraph, `B.b`→a `-` list item, `B.tip`→a
  `> **Tip:** …` blockquote) — every HelpManual article gets a KB counterpart, no exceptions,
  so the two lists should always have the same members. If Rob edits a KB article directly in
  Decap CMS (`/cms/`, bypassing Claude), the reverse sync back into `HelpManual.kt` doesn't
  happen automatically — ask Claude to pull the latest KB content and convert it back into the
  Kotlin block DSL next session.
- **Statuses**: request lifecycle enum in `src/lib/types.ts` mirrors `request_status` in SQL —
  change both together (plus the workflows that PATCH statuses).
- **Workflows**: `dispatch` edge function ↔ `repository_dispatch` event names ↔
  `.github/workflows/*.yml` in ActorsVoice must stay in sync (`triage-report`,
  `implementation-plan`, `implement-pr`).
- Build check: `npm run build` (CI runs the same).
