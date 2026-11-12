import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface TableProps {
  caption: string;
  captionHidden?: boolean;
  label: string;
  className?: string;
  children: ReactNode;
}

function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export default function Table({ caption, captionHidden = false, label, className, children }: TableProps) {
  return (
    <div role="region" aria-label={label} tabIndex={0} className={cx("al-table-scroll", className)}>
      <table className="al-table">
        <caption className={captionHidden ? "al-sr-only" : "al-table__caption"}>{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export type TableActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function TableActionButton({ className, type = "button", children, ...rest }: TableActionButtonProps) {
  return (
    <button {...rest} type={type} className={cx("al-table-action", className)}>
      {children}
    </button>
  );
}
