import { useEffect } from "react";

/**
 * Adds <meta name="robots" content="noindex"> while the page is mounted (same mechanism as the empty
 * /tutorials page). Used by /tutorials while it has no videos.
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
