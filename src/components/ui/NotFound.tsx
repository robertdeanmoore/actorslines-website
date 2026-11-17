import { useEffect } from "react";
import LinkButton from "./LinkButton";

/**
 * Neutral 404 view for unknown routes (design spec 03 section 18), routed as the catch-all `*` in
 * App.tsx. Wording ruled by Clarity (PR68 review). The HTTP status stays 200 (SPA shell) until
 * worker/routing.ts gets a route list (open item for Holly); the page is noindex meanwhile.
 */
export default function NotFound() {
  useEffect(() => {
    const previousTitle = document.title;
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);
    document.title = "Page not found | Actors Lines";
    return () => {
      document.title = previousTitle;
      meta.remove();
    };
  }, []);

  return (
    <div className="al-notfound">
      <p className="al-notfound__eyebrow">404</p>
      <h1>We can&apos;t find that page</h1>
      <p>The link may be old, or the address may have a typing mistake.</p>
      <div className="al-notfound__actions">
        <LinkButton to="/" variant="primary">Go to the home page</LinkButton>
        <LinkButton to="/kb" variant="secondary">Browse help</LinkButton>
      </div>
    </div>
  );
}
