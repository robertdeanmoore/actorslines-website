import { useId, type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  block?: boolean;
  busy?: boolean;
  disabledReason?: ReactNode;
}

function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export default function Button({
  variant = "primary",
  block = false,
  busy = false,
  disabledReason,
  className,
  type = "button",
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const hintId = useId();
  const isDisabled = Boolean(disabled) || busy;
  const showHint = isDisabled && Boolean(disabledReason);

  const button = (
    <button
      {...rest}
      type={type}
      className={cx("al-btn", `al-btn--${variant}`, block && "al-btn--block", className)}
      disabled={isDisabled}
      aria-busy={busy || undefined}
      aria-describedby={showHint ? hintId : undefined}
    >
      {children}
    </button>
  );

  if (!showHint) return button;

  return (
    <>
      {button}
      <p id={hintId} className="al-hint" role="status">
        {disabledReason}
      </p>
    </>
  );
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

export function IconButton({ label, className, type = "button", children, ...rest }: IconButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      aria-label={label}
      className={cx("al-btn", "al-btn--ghost", "al-icon-btn", className)}
    >
      {children}
    </button>
  );
}
