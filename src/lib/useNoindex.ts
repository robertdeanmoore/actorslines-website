import { useEffect } from "react";

/**
 * Adds <meta name="robots" content="noindex"> while the page is mounted (same mechanism as the empty
 * /tutorials page). Used by the WIP #257 marketing pages (/features, /faq, /support): the routes are
 * reachable on every host but stay out of search results until go-live.
 * GO-LIVE: remove the useNoindex() call from MarketingHead and add the three URLs to public/sitemap.xml.
 */
export function useNoindex(): void {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);
}
