# Marketing pages (`/features`, `/faq`, `/support`)

**Purpose:** the go-live pages for the redesign (WIP #257, "go live with new look and content, no payments"). Copy is Clarity's, verbatim: `Actors Lines - Website Features Page Copy`, `... FAQ Page Copy`, `... Support Page Copy` (2026-11-14, RobLife `Deliverables/`). Holly is reviewing the copy: any line she changes must be changed here too, and the change listed in the PR.

**Status:** live from slice 6a (WIP #257): indexable, in `public/sitemap.xml` and `llms.txt`, linked from the public nav (Features, FAQ, Support). The footer links are added after the legal-pages PR lands. No price, trial, licence or Rehearse wording anywhere on these pages (`worker/discoverability.test.ts` checks the meta text).

**Key files**
- `src/pages/FeaturesPage.tsx`, `FaqPage.tsx`, `SupportPage.tsx`: page content (copy lives in these files).
- `src/components/marketing/MarketingHead.tsx`: h1 and lead.
- `src/lib/routeMeta.ts`: title and description per route.
- `src/components/ui/Accordion.tsx`: FAQ disclosure rows (native `<details>`, keyboard and screen-reader support built in).
- `src/styles/marketing.css`: tokens only.

**FAQ structured data:** FAQPage JSON-LD is not added (Clarity: not recommended, Holly point open).

**Go-live:** done in slice 6a. Still open: settle the CTA wording tagged `[CTA pending]` in `FeaturesPage.tsx` and `FaqPage.tsx`, and footer links.
