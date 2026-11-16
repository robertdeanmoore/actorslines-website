// Dark-launch flag for the night theme (WIP #257 design system, option B "House Lights Down").
// <html data-theme="night"> switches the semantic tokens in src/styles/tokens.css to the night set.
// Without it the same components render with the paper values (the cream look), so production is
// never half-night. Slice 6 makes night unconditional and deletes this file's conditions.

const PRODUCTION_HOSTS = new Set(["actorslines.app", "www.actorslines.app"]);

const NIGHT_THEME_COLOR = "#120845";
const PAPER_THEME_COLOR = "#FBF7EF";

const STORAGE_KEY = "al-theme";

export type ThemeStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/**
 * True when the night theme should be on for this page load.
 * `?theme=night` turns it on and, when a session store is given, remembers it for the browser
 * session; `?theme=standard` clears that memory. Storage can throw (privacy modes), so every
 * access falls back to "no stored value". Production hosts never read or write the store.
 */
export function nightThemeRequested(
  hostname: string,
  search: string,
  envTheme: string | undefined,
  store?: ThemeStore,
): boolean {
  // Production hosts never go night, whatever the build env, query or store says (checked first).
  // Normalised first: a single trailing dot (absolute FQDN) is the same host.
  if (PRODUCTION_HOSTS.has(hostname.toLowerCase().replace(/\.$/, ""))) return false;
  if (envTheme === "night") return true;
  const param = new URLSearchParams(search).get("theme");
  if (param === "night") {
    try {
      store?.setItem(STORAGE_KEY, "night");
    } catch {
      /* storage unavailable: the query alone still applies for this load */
    }
    return true;
  }
  if (param === "standard") {
    try {
      store?.removeItem(STORAGE_KEY);
    } catch {
      /* nothing to clear */
    }
    return false;
  }
  try {
    return store?.getItem(STORAGE_KEY) === "night";
  } catch {
    return false;
  }
}

function sessionStore(): ThemeStore | undefined {
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

/** Sets or clears data-theme on <html> and keeps the browser-chrome meta tags in step. */
export function applyThemeFlag(): void {
  const night = nightThemeRequested(
    window.location.hostname,
    window.location.search,
    import.meta.env.VITE_THEME,
    sessionStore(),
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
