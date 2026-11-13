import { useEffect, useRef } from "react";

export type FieldProblem = { fieldId: string; message: string };

/**
 * Form-level error list for forms with more than two fields (design spec 03 section 12). When
 * `submitCount` goes up and there are problems, focus moves to the summary; each entry links to
 * its field and moves focus there. Renders nothing when there are no problems.
 */
export default function ErrorSummary({
  problems,
  submitCount,
  title = "There is a problem",
}: {
  problems: FieldProblem[];
  /** Increment on every submit attempt; focus is moved only when this changes. */
  submitCount: number;
  title?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const hasProblems = problems.length > 0;

  useEffect(() => {
    if (submitCount > 0 && hasProblems) ref.current?.focus();
  }, [submitCount, hasProblems]);

  if (!hasProblems) return null;

  return (
    <div ref={ref} role="alert" tabIndex={-1} className="al-error-summary">
      <p className="al-error-summary__title">{title}</p>
      <ul>
        {problems.map((p) => (
          <li key={p.fieldId}>
            <a
              href={`#${p.fieldId}`}
              onClick={(e) => {
                const field = document.getElementById(p.fieldId);
                if (!field) return;
                e.preventDefault();
                field.focus();
                field.scrollIntoView({ block: "center" });
              }}
            >
              {p.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
