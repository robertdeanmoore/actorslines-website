import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export interface BentoProps {
  className?: string;
  children: ReactNode;
}

export function Bento({ className, children }: BentoProps) {
  return <div className={className ? `al-bento ${className}` : "al-bento"}>{children}</div>;
}

export interface BentoTileProps {
  eyebrow?: string;
  title: string;
  headingLevel?: 2 | 3 | 4;
  hero?: boolean;
  wide?: boolean;
  to?: string;
  linkLabel?: string;
  className?: string;
  children?: ReactNode;
  media?: ReactNode;
}

export function BentoTile({
  eyebrow,
  title,
  headingLevel = 3,
  hero = false,
  wide = false,
  to,
  linkLabel = "Learn more",
  className,
  children,
  media,
}: BentoTileProps) {
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";

  return (
    <div
      className={className ? `al-tile ${className}` : "al-tile"}
      data-hero={hero || undefined}
      data-wide={wide || undefined}
    >
      {eyebrow ? <p className="al-tile__eyebrow">{eyebrow}</p> : null}
      <Heading className="al-tile__title">{title}</Heading>
      {children ? <div className="al-tile__body">{children}</div> : null}
      {media ? <div className="al-tile__media">{media}</div> : null}
      {to ? (
        <Link className="al-tile__link" to={to}>
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}

export default Bento;
