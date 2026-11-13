import type { ReactNode } from "react";

/** List of native <details> rows (FAQ): keyboard, screen-reader and no-JS behaviour are built in. */
export function Accordion({ children }: { children: ReactNode }) {
  return <ul className="al-accordion">{children}</ul>;
}

export function AccordionItem({
  summary,
  children,
  defaultOpen = false,
}: {
  summary: string;
  children: ReactNode;
  /** Off by default: the spec never pre-opens the first item. */
  defaultOpen?: boolean;
}) {
  return (
    <li className="al-accordion__item">
      <details open={defaultOpen || undefined}>
        <summary>
          <span>{summary}</span>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 8l5 5 5-5" />
          </svg>
        </summary>
        <div className="al-accordion__panel">{children}</div>
      </details>
    </li>
  );
}
