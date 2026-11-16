// Theme switch for the website (WIP #257 design system, option B "House Lights Down").
// <html data-theme="night"> switches the semantic tokens in src/styles/tokens.css to the night set.
// Without it the same components render with the paper values (the legacy cream look).
//
// Slice 6a (go-live): night is the default everywhere, production included.
// ROLLBACK is one commit: set DEFAULT_THEME to "standard" below AND remove data-theme="night" from
// <html> in index.html, and set its theme-color / color-scheme metas back to #FBF7EF / light.
// Both edits are needed: index.html paints night before JS runs, this file decides after.
// Slice 6b deletes the paper branches and this file's conditions.

export type Theme = "night" | "standard";

export const DEFAULT_THEME: Theme = "night";

const PRODUCTION_HOSTS = new Set(["actorslines.app", "www.actorslines.app"]);

const NIGHT_THEME_COLOR = "#120845";
const PAPER_THEME_COLOR = "#FBF7EF";

function isProductionHost(hostname: string): boolean {
  return PRODUCTION_HOSTS.has(hostname.toLowerCase());
}

/**
 * The theme for this page load. Production hosts always get DEFAULT_THEME. Other hosts (previews,
 * localhost) default to it too, but ?theme=standard or ?theme=night (or VITE_THEME) overrides it,
 * so the legacy look can be checked before a rollback without ever being shown on production.
 */
export function resolveTheme(
  hostname: string,
  search: string,
  envTheme: string | undefined,
  defaultTheme: Theme = DEFAULT_THEME,
): Theme {
  if (isProductionHost(hostname)) return defaultTheme;
  const query = new URLSearchParams(search).get("theme");
  if (query === "night" || query === "standard") return query;
  if (envTheme === "night" || envTheme === "standard") return envTheme;
  return defaultTheme;
}

/** /_ui-gallery (component demo, placeholder copy) is never reachable on production hosts. */
export function uiGalleryAllowed(hostname: string, isDevBuild: boolean): boolean {
  return isDevBuild || !isProductionHost(hostname);
}

/** Sets or clears data-theme on <html> and keeps the browser-chrome meta tags in step. */
export function applyThemeFlag(): void {
  const night =
    resolveTheme(window.location.hostname, window.location.search, import.meta.env.VITE_THEME) === "night";
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

/** True once applyThemeFlag has switched the night theme on. */
export function isNightTheme(): boolean {
  return document.documentElement.getAttribute("data-theme") === "night";
}
