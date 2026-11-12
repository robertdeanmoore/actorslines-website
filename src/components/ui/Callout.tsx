import type { ReactNode } from "react";

export type CalloutTone = "tip" | "note" | "success" | "warning" | "error";

export interface CalloutProps {
  tone?: CalloutTone;
  title?: string;
  id?: string;
  className?: string;
  children: ReactNode;
}

function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function Icon({ tone }: { tone: CalloutTone }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (tone) {
    case "success":
      return (
        <svg {...common}>
          <circle cx="10" cy="10" r="8" />
          <path d="M6.2 10.3l2.6 2.6 5-5.4" />
        </svg>
      );
    case "warning":
      return (
        <svg {...common}>
          <path d="M10 3l7.2 13H2.8L10 3z" />
          <path d="M10 8v3.4" />
          <path d="M10 13.8h.01" />
        </svg>
      );
    case "error":
      return (
        <svg {...common}>
          <polygon points="7 3 13 3 17 7 17 13 13 17 7 17 3 13 3 7" />
          <path d="M8 8l4 4M12 8l-4 4" />
        </svg>
      );
    case "note":
      return (
        <svg {...common}>
          <path d="M6 3h5l3 3v11H6V3z" />
          <path d="M11 3v3h3" />
          <path d="M8.4 11h3.2M8.4 13.6h3.2" />
        </svg>
      );
    case "tip":
    default:
      return (
        <svg {...common}>
          <circle cx="10" cy="10" r="8" />
          <path d="M10 9.2v4.6" />
          <path d="M10 6.4h.01" />
        </svg>
      );
  }
}

export default function Callout({ tone = "note", title, id, className, children }: CalloutProps) {
  return (
    <div
      id={id}
      className={cx("al-callout", `al-callout--${tone}`, className)}
      role={tone === "error" ? "alert" : "status"}
    >
      <span className="al-callout__icon">
        <Icon tone={tone} />
      </span>
      <div>
        {title ? <p className="al-callout__title">{title}</p> : null}
        <div className="al-callout__body">{children}</div>
      </div>
    </div>
  );
}
