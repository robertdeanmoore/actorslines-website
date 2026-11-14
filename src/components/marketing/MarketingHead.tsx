import type { ReactNode } from "react";
import { useNoindex } from "../../lib/useNoindex";

/** Page heading block for the marketing pages: h1, optional lead, and the noindex-until-go-live meta. */
export default function MarketingHead({ title, lead }: { title: string; lead?: ReactNode }) {
  useNoindex();
  return (
    <header className="al-mkt-head">
      <h1 className="al-page-title">{title}</h1>
      {lead ? <p className="al-mkt-lead">{lead}</p> : null}
    </header>
  );
}
