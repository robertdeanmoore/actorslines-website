import type { ReactNode } from "react";
import Button from "./Button";

export interface SkeletonProps {
  lines?: number;
  height?: string;
  className?: string;
}

export function Skeleton({ lines = 3, height, className }: SkeletonProps) {
  return (
    <div className={className} data-skeleton aria-hidden="true">
      <div className="al-skeleton">
        {height !== undefined ? (
          <div className="al-skeleton__block" style={{ height }} />
        ) : (
          Array.from({ length: lines }, (_, i) => <div key={i} className="al-skeleton__line" />)
        )}
      </div>
    </div>
  );
}

export interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({ label = "Loading...", className }: LoadingStateProps) {
  return (
    <div className={className} role="status">
      <p className="al-loading">{label}</p>
    </div>
  );
}

function EmptyIcon() {
  return (
    <svg
      width={32}
      height={32}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9h20v16H6z" />
      <path d="M6 13h20" />
      <path d="M11 22h10" />
    </svg>
  );
}

export interface EmptyStateProps {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  headingLevel?: 2 | 3;
  className?: string;
}

export function EmptyState({ title, children, action, icon, headingLevel = 2, className }: EmptyStateProps) {
  const Heading = `h${headingLevel}` as "h2" | "h3";

  return (
    <div className={className}>
      <div className="al-empty">
        <span className="al-empty__icon" aria-hidden="true">
          {icon ?? <EmptyIcon />}
        </span>
        <Heading className="al-empty__title">{title}</Heading>
        {children ? <p className="al-empty__body">{children}</p> : null}
        {action ? <div className="al-empty__action">{action}</div> : null}
      </div>
    </div>
  );
}

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  details?: string;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  details,
  className,
}: ErrorStateProps) {
  return (
    <div className={className}>
      <div className="al-error" role="alert">
        <p className="al-error__title">{title}</p>
        <p className="al-error__message">{message}</p>
        {onRetry ? (
          <div className="al-error__retry">
            <Button variant="secondary" onClick={onRetry}>
              Try again
            </Button>
          </div>
        ) : null}
        {details ? (
          <details className="al-error__details">
            <summary>Details</summary>
            <pre className="al-error__pre" tabIndex={0} role="region" aria-label="Error details">
              {details}
            </pre>
          </details>
        ) : null}
      </div>
    </div>
  );
}

export default Skeleton;
