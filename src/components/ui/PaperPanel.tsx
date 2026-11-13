import type { ElementType, ReactNode } from "react";

/**
 * Light "digital paper" surface on any page. The semantic tokens re-bind to the paper values inside
 * [data-surface="paper"] (tokens.css), so everything dropped in is correct without extra classes.
 * Used for the Learn Lines web view, the 2FA QR (dark on light) and figures that show the app.
 */
export default function PaperPanel({
  as: Tag = "div",
  className,
  children,
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag data-surface="paper" className={className ? `al-paper ${className}` : "al-paper"}>
      {children}
    </Tag>
  );
}
