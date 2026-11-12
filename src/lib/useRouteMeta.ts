import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { kbArticle } from "./kb";
import { jsonLdText, routeMeta, softwareApplicationJsonLd } from "./routeMeta";

const JSON_LD_ID = "al-jsonld-app";

/**
 * Keeps document.title and the meta description in step with the route (single-page app, one
 * index.html), and adds the SoftwareApplication JSON-LD on the landing page only. Called once
 * from Layout. Crawlers that render JavaScript see these; the static index.html defaults cover
 * the rest.
 */
export function useRouteMeta(): void {
  const { pathname } = useLocation();

  useEffect(() => {
    const meta = routeMeta(pathname, kbArticle);
    document.title = meta.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", meta.description);

    document.getElementById(JSON_LD_ID)?.remove();
    if (pathname === "/") {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = JSON_LD_ID;
      script.textContent = jsonLdText(softwareApplicationJsonLd());
      document.head.appendChild(script);
    }
  }, [pathname]);
}
