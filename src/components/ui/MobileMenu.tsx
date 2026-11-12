import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

const DESKTOP_QUERY = "(min-width: 48rem)";

/**
 * Below 768px: a labelled "Menu" button and a full-width panel under the header (not off-canvas).
 * Esc closes and returns focus to the button; a route change or any click inside the panel closes it.
 * Deliberately not a modal: no focus trap and no scroll lock, the page behind stays reachable
 * (design spec 03 section 1). Focus stays inside only by DOM order.
 */
export default function MobileMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => {
      if (mq.matches) setOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="al-menu-btn md:hidden"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {open ? (
            <path d="M5 5l12 12M17 5L5 17" />
          ) : (
            <path d="M3 6h16M3 11h16M3 16h16" />
          )}
        </svg>
        <span>Menu</span>
      </button>
      <div id={panelId} className="al-menu-panel md:hidden" hidden={!open} onClick={close}>
        {children}
      </div>
    </>
  );
}
