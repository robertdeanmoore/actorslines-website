import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * After a client-side route change, move focus to the page's h1 (or to <main> when the page has
 * none yet) so keyboard and screen-reader users land at the top of the new content. The first
 * render is left alone so a fresh page load keeps the browser's own focus behaviour.
 */
export function useRouteFocus(): void {
  const { pathname } = useLocation();
  const lastPath = useRef(pathname);

  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    const frame = requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>("#main h1") ?? document.getElementById("main");
      if (!target) return;
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);
}
