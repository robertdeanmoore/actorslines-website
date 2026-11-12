import { useId, type ReactNode } from "react";

function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export type ContainerSize = "page" | "detail" | "form" | "formWide" | "prose";

export interface ContainerProps {
  size?: ContainerSize;
  as?: "div" | "section" | "article";
  className?: string;
  children: ReactNode;
}

export function Container({ size = "page", as = "div", className, children }: ContainerProps) {
  const Tag = as;
  return <Tag className={cx("al-container", `al-container--${size}`, className)}>{children}</Tag>;
}

export interface SectionProps {
  title?: string;
  eyebrow?: string;
  headingLevel?: 2 | 3;
  id?: string;
  tone?: "default" | "surface";
  className?: string;
  children: ReactNode;
}

export function Section({
  title,
  eyebrow,
  headingLevel = 2,
  id,
  tone = "default",
  className,
  children,
}: SectionProps) {
  const headingId = useId();
  const Heading = `h${headingLevel}` as "h2" | "h3";

  return (
    <section
      id={id}
      className={cx("al-section", tone === "surface" && "al-section--surface", className)}
      aria-labelledby={title ? headingId : undefined}
    >
      <Container size="page">
        {title ? (
          <div className="al-section__header">
            {eyebrow ? <p className="al-section__eyebrow">{eyebrow}</p> : null}
            <Heading id={headingId} className="al-section__title">
              {title}
            </Heading>
          </div>
        ) : null}
        {children}
      </Container>
    </section>
  );
}

export default Container;
