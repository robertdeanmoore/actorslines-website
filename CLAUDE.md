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
- **Every KB article pairs with an in-app Help article, matched by slug/id — but as of Actors
  Lines #49 (Aug 2026) this is a two-tier split, not word-for-word parity.** `src/content/kb/
  <slug>.md` pairs with `HelpManual.<CONST>` in the ActorsVoice repo wherever
  `HelpManual.<CONST> = "<slug>"` (e.g. `src/content/kb/selftape.md` ↔ `HelpManual.SELFTAPE`).
  **This KB is the full-detail tier** — every option, every edge case, the reasoning behind a
  design choice; the in-app article is a short quick-start only (summary + steps to get going +
  at most a tip) that links out here for anyone who wants more. The full rule, with what
  "abbreviated" vs "full" means in practice, is recorded in the ActorsVoice repo's root
  `CLAUDE.md` — this is the copy of record for the KB side, not a duplicate ruleset. No
  automated sync exists — the pairing is the shared filename, kept in sync by hand. **Every
  `HelpManual.kt` article must have a KB counterpart, no exceptions** — when adding a new
  feature, write both in the same piece of work; when editing an existing one, update whichever
  tier(s) the change actually touches (a UI-only tweak may only need the in-app quick-start; new
  detail usually needs the KB's fuller account too). If Rob edits a KB article directly in Decap
  CMS (`/cms/`, bypassing Claude), pull the latest KB content before editing it further rather
  than overwriting it blind.
- **Statuses**: request lifecycle enum in `src/lib/types.ts` mirrors `request_status` in SQL —
  change both together (plus the workflows that PATCH statuses).
- **Workflows**: `dispatch` edge function ↔ `repository_dispatch` event names ↔
  `.github/workflows/*.yml` in ActorsVoice must stay in sync (`triage-report`,
  `implementation-plan`, `implement-pr`).
- Build check: `npm run build` (CI runs the same).
