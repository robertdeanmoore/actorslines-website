import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export type CardTone = "marketing" | "dense";

export interface CardProps {
  title?: ReactNode;
  eyebrow?: string;
  headingLevel?: 2 | 3 | 4;
  tone?: CardTone;
  as?: "div" | "article" | "section" | "li";
  to?: string;
  className?: string;
  children?: ReactNode;
}

function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export default function Card({
  title,
  eyebrow,
  headingLevel = 3,
  tone = "dense",
  as = "div",
  to,
  className,
  children,
}: CardProps) {
  const Tag = as;
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";
  const clickable = Boolean(to && title);

  return (
    <Tag className={cx("al-card", `al-card--${tone}`, clickable && "al-card--link", className)}>
      {eyebrow ? <p className="al-card__eyebrow">{eyebrow}</p> : null}
      {title ? (
        <Heading className="al-card__title">
          {clickable ? (
            <Link to={to as string} className="al-card__link">
              {title}
            </Link>
          ) : (
            title
          )}
        </Heading>
      ) : null}
      {children}
    </Tag>
  );
}
