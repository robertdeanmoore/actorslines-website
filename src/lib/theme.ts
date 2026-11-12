// Dark-launch flag for the night theme (WIP #257 design system, option B "House Lights Down").
// <html data-theme="night"> switches the semantic tokens in src/styles/tokens.css to the night set.
// Without it the same components render with the paper values (the cream look), so production is
// never half-night. Slice 6 makes night unconditional and deletes this file's conditions.

const PRODUCTION_HOSTS = new Set(["actorslines.app", "www.actorslines.app"]);

const NIGHT_THEME_COLOR = "#120845";
const PAPER_THEME_COLOR = "#FBF7EF";

/** True when the night theme should be on for this page load. */
export function nightThemeRequested(
  hostname: string,
  search: string,
  envTheme: string | undefined,
): boolean {
  if (envTheme === "night") return true;
  if (PRODUCTION_HOSTS.has(hostname.toLowerCase())) return false;
  return new URLSearchParams(search).get("theme") === "night";
}

/** Sets or clears data-theme on <html> and keeps the browser-chrome meta tags in step. */
export function applyThemeFlag(): void {
  const night = nightThemeRequested(
    window.location.hostname,
    window.location.search,
    import.meta.env.VITE_THEME,
  );
  const root = document.documentElement;
  if (night) root.setAttribute("data-theme", "night");
  else root.removeAttribute("data-theme");
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", night ? NIGHT_THEME_COLOR : PAPER_THEME_COLOR);
  document
    .querySelector('meta[name="color-scheme"]')
    ?.setAttribute("content", night ? "dark" : "light");
}

/** True once applyThemeFlag has switched the night theme on (used to show night-only placeholders). */
export function isNightTheme(): boolean {
  return document.documentElement.getAttribute("data-theme") === "night";
}
