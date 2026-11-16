import type { ReactNode } from "react";

/** Page heading block for the marketing pages: h1 and optional lead. */
export default function MarketingHead({ title, lead }: { title: string; lead?: ReactNode }) {
  return (
    <header className="al-mkt-head">
      <h1 className="al-page-title">{title}</h1>
      {lead ? <p className="al-mkt-lead">{lead}</p> : null}
    </header>
  );
}
