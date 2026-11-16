# Marketing pages (`/features`, `/faq`, `/support`)

**Purpose:** the go-live pages for the redesign (WIP #257, "go live with new look and content, no payments"). Copy is Clarity's, verbatim: `Actors Lines - Website Features Page Copy`, `... FAQ Page Copy`, `... Support Page Copy` (2026-11-14, RobLife `Deliverables/`). Holly is reviewing the copy: any line she changes must be changed here too, and the change listed in the PR.

**Status:** routes exist on every host, reachable by URL, `noindex` (meta robots, `useNoindex`), not in the nav, not in `public/sitemap.xml`. Same pattern as `/tutorials`. No price, trial, licence or Rehearse wording anywhere on these pages (`worker/discoverability.test.ts` checks the meta text).

**Key files**
- `src/pages/FeaturesPage.tsx`, `FaqPage.tsx`, `SupportPage.tsx`: page content (copy lives in these files).
- `src/components/marketing/MarketingHead.tsx`: h1, lead, noindex.
- `src/lib/useNoindex.ts`: the noindex meta.
- `src/lib/routeMeta.ts`: title and description per route.
- `src/components/ui/Accordion.tsx`: FAQ disclosure rows (native `<details>`, keyboard and screen-reader support built in).
- `src/styles/marketing.css`: tokens only.

**FAQ structured data:** FAQPage JSON-LD is not added (Clarity: not recommended, Holly point open).

**Go-live switch (one commit):** remove `useNoindex()` from `MarketingHead`, add the three URLs to `public/sitemap.xml` (placeholder comment there), update the hidden-list in `worker/discoverability.test.ts`, add nav and footer links, and settle the CTA wording tagged `[CTA pending]` in `FeaturesPage.tsx` and `FaqPage.tsx`.
