import type { ReactNode } from "react";
import { isNightTheme } from "../lib/theme";

type Props = {
  caption: string;
  head: string[];
  rows: ReactNode[][];
};

// Table for the legal pages. Night: the al-legal-table rules in legal.css. Legacy: Tailwind utilities.
export default function LegalTable({ caption, head, rows }: Props) {
  const night = isNightTheme();
  return (
    // A scrollable region must be reachable by keyboard (WCAG 2.1.1): focusable, named, with a visible focus ring.
    <div
      tabIndex={0}
      role="region"
      aria-label={caption}
      className={
        night
          ? "al-legal-table-wrap"
          : "mt-2 overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      }
    >
      <table className={night ? "al-legal-table" : "w-full text-left text-sm text-gray-700 border-collapse"}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className={night ? undefined : "border border-gray-200 bg-gray-50 p-2 align-top"}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className={night ? undefined : "border border-gray-200 p-2 align-top"}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
