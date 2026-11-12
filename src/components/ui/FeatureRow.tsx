import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Bento, BentoTile } from "./Bento";

function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function CheckIcon() {
  return (
    <svg
      className="al-feature__check"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 10.5l4 4 8-9" />
    </svg>
  );
}

export interface FeatureRowProps {
  eyebrow?: string;
  title: string;
  headingLevel?: 2 | 3 | 4;
  children: ReactNode;
  bullets?: string[];
  media?: ReactNode;
  reverse?: boolean;
  to?: string;
  linkLabel?: string;
  className?: string;
}

export function FeatureRow({
  eyebrow,
  title,
  headingLevel = 2,
  children,
  bullets,
  media,
  reverse = false,
  to,
  linkLabel = "Learn more",
  className,
}: FeatureRowProps) {
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";

  return (
    <div className={cx("al-feature", reverse && "al-feature--reverse", className)}>
      <div className="al-feature__text">
        {eyebrow ? <p className="al-feature__eyebrow">{eyebrow}</p> : null}
        <Heading className="al-feature__title">{title}</Heading>
        <p className="al-feature__body">{children}</p>
        {bullets && bullets.length > 0 ? (
          <ul className="al-feature__bullets">
            {bullets.slice(0, 4).map((bullet) => (
              <li key={bullet} className="al-feature__bullet">
                <CheckIcon />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {to ? (
          <p>
            <Link className="al-feature__link" to={to}>
              {linkLabel}
            </Link>
          </p>
        ) : null}
      </div>
      {media ? <div className="al-feature__media">{media}</div> : null}
    </div>
  );
}

export interface FeatureSectionItem {
  title: string;
  body: string;
  eyebrow?: string;
  to?: string;
  linkLabel?: string;
}

export interface FeatureSectionProps {
  title: string;
  intro?: string;
  headingLevel?: 2 | 3;
  variant?: "bento" | "cue-sheet";
  items: FeatureSectionItem[];
  className?: string;
}

export function FeatureSection({
  title,
  intro,
  headingLevel = 2,
  variant = "bento",
  items,
  className,
}: FeatureSectionProps) {
  const Heading = `h${headingLevel}` as "h2" | "h3";
  const itemLevel = (headingLevel + 1) as 3 | 4;

  return (
    <section className={cx("al-feature-section", className)}>
      <Heading className="al-feature__title">{title}</Heading>
      {intro ? <p className="al-feature-section__intro">{intro}</p> : null}
      {variant === "cue-sheet" ? (
        <ol className="al-cue-sheet" role="list">
          {items.map((item, index) => {
            const ItemHeading = `h${itemLevel}` as "h3" | "h4";
            return (
              <li key={item.title} className="al-cue-sheet__item">
                <span className="al-cue-sheet__index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <ItemHeading className="al-cue-sheet__title">{item.title}</ItemHeading>
                <p className="al-cue-sheet__body">{item.body}</p>
              </li>
            );
          })}
        </ol>
      ) : (
        <Bento>
          {items.map((item, index) => (
            <BentoTile
              key={item.title}
              eyebrow={item.eyebrow}
              title={item.title}
              headingLevel={itemLevel}
              hero={index === 0}
              wide={items.length === 6 && index === items.length - 1}
              to={item.to}
              linkLabel={item.linkLabel}
            >
              {item.body}
            </BentoTile>
          ))}
        </Bento>
      )}
    </section>
  );
}

export default FeatureRow;
