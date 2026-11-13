import { useId, type ComponentPropsWithRef, type ReactNode } from "react";

function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function ErrorIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.4" />
      <path d="M8 5.2v3.4" />
      <path d="M8 11.1h.01" />
    </svg>
  );
}

export interface FieldControl {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  required?: boolean;
}

export interface FieldProps {
  label: string;
  required?: boolean;
  help?: ReactNode;
  error?: string;
  id?: string;
  className?: string;
  children: (control: FieldControl) => ReactNode;
}

export function Field({ label, required = false, help, error, id, className, children }: FieldProps) {
  const reactId = useId();
  const fieldId = id ?? reactId;
  const helpId = `${fieldId}-help`;
  const errorId = `${fieldId}-error`;
  const describedBy =
    [help ? helpId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  const control: FieldControl = {
    id: fieldId,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
    required: required ? true : undefined,
  };

  return (
    <div className={cx("al-field", className)}>
      <label className="al-field__label" htmlFor={fieldId}>
        {label}
        {required ? " (required)" : ""}
      </label>
      {help ? (
        <p id={helpId} className="al-field__help">
          {help}
        </p>
      ) : null}
      {children(control)}
      {error ? (
        <p id={errorId} className="al-field__error">
          <ErrorIcon />
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default Field;

export type InputProps = ComponentPropsWithRef<"input">;

export function Input({ className, ...rest }: InputProps) {
  return <input className={cx("al-control", className)} {...rest} />;
}

export type TextareaProps = ComponentPropsWithRef<"textarea">;

export function Textarea({ className, ...rest }: TextareaProps) {
  return <textarea className={cx("al-control", className)} {...rest} />;
}

export type SelectProps = ComponentPropsWithRef<"select">;

export function Select({ className, children, ...rest }: SelectProps) {
  return (
    <div className={cx("al-select", className)}>
      <select className="al-control" {...rest}>
        {children}
      </select>
      <svg className="al-select__chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M4 6l4 4 4-4"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export type CheckboxProps = Omit<ComponentPropsWithRef<"input">, "type"> & {
  label: ReactNode;
  error?: string;
  help?: ReactNode;
};

export function Checkbox({ label, error, help, id, className, ...rest }: CheckboxProps) {
  const reactId = useId();
  const inputId = id ?? reactId;
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;
  const describedBy =
    [help ? helpId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cx("al-check-wrap", className)}>
      <label className="al-check">
        <input
          {...rest}
          id={inputId}
          type="checkbox"
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
        />
        <span className="al-check__box" aria-hidden="true" />
        <span className="al-check__text">{label}</span>
      </label>
      {help ? (
        <p id={helpId} className="al-field__help">
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="al-check__error">
          <ErrorIcon />
          {error}
        </p>
      ) : null}
    </div>
  );
}
