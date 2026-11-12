// Per-route <title> and meta description, plus the landing page's SoftwareApplication JSON-LD.
// Pure module (no Vite or DOM imports) so the worker test runner can import it. The default
// description must match index.html. Wording is factual and taken from existing site text;
// Clarity owns any change of voice.

export const SITE_URL = "https://actorslines.app";
export const DEFAULT_TITLE = "Actors Lines";
export const DEFAULT_DESCRIPTION =
  "Actors Lines — the on-device line-learning companion for actors. Learn your lines, your way.";

const SUFFIX = " | Actors Lines";

export type RouteMeta = { title: string; description: string };

export type KbLookup = (slug: string) => { title: string; summary: string } | undefined;

const STATIC_META: Record<string, Partial<RouteMeta>> = {
  "/kb": {
    title: `Knowledge base${SUFFIX}`,
    description: "Line-learning technique, and getting the most from Actors Lines.",
  },
  "/privacy": { title: `Privacy Policy${SUFFIX}` },
  "/terms": { title: `Terms of Use${SUFFIX}` },
  "/login": { title: `Sign in${SUFFIX}` },
  "/register": { title: `Create your account${SUFFIX}` },
  "/tutorials": { title: `Tutorials${SUFFIX}` },
};

/** Title and description for a pathname. Unknown routes get the site defaults. */
export function routeMeta(pathname: string, kb: KbLookup): RouteMeta {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const article = path.match(/^\/kb\/([^/]+)$/);
  if (article) {
    const found = kb(article[1]);
    if (found) {
      return { title: `${found.title}${SUFFIX}`, description: found.summary || DEFAULT_DESCRIPTION };
    }
    return { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION };
  }
  const entry = STATIC_META[path] ?? {};
  return {
    title: entry.title ?? DEFAULT_TITLE,
    description: entry.description ?? DEFAULT_DESCRIPTION,
  };
}

/**
 * schema.org SoftwareApplication for the landing page. Deliberately has no offers, price, rating,
 * version or review fields (nothing is promised in structured data), and says Android only (the
 * iPhone wording on the site is "being explored").
 */
export function softwareApplicationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Actors Lines",
    description: DEFAULT_DESCRIPTION,
    url: `${SITE_URL}/`,
    image: `${SITE_URL}/assets/logo-mark.png`,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Android",
  };
}

/** JSON for a <script type="application/ld+json"> body; "<" is escaped so the data cannot close the tag. */
export function jsonLdText(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
