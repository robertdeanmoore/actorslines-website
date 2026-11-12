import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { ButtonVariant } from "./Button";

interface LinkButtonBase {
  variant?: ButtonVariant;
  block?: boolean;
  newTab?: boolean;
  className?: string;
  children: ReactNode;
}

export type LinkButtonProps =
  | (LinkButtonBase & { to: string; href?: never })
  | (LinkButtonBase & { href: string; to?: never });

function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Renders the same `al-btn` markup as Button but keeps anchor semantics (react-router Link or plain anchor). */
export default function LinkButton(props: LinkButtonProps) {
  const { variant = "primary", block = false, newTab = false, className, children } = props;
  const classes = cx("al-btn", `al-btn--${variant}`, block && "al-btn--block", className);

  if (props.to !== undefined) {
    return (
      <Link to={props.to} className={classes}>
        {children}
      </Link>
    );
  }

  const isExternal = /^https?:/i.test(props.href);

  return (
    <a
      href={props.href}
      className={classes}
      rel={isExternal ? "noreferrer" : undefined}
      target={newTab ? "_blank" : undefined}
    >
      {children}
      {newTab ? <span className="al-sr-only"> (opens in a new tab)</span> : null}
    </a>
  );
}
