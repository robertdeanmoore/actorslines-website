import { useEffect, useId, useRef, type ReactNode } from "react";
import Button, { IconButton } from "./Button";

type ModalProps = {
  open: boolean;
  /** Called when the dialog closes by Esc, the close button or a backdrop click. The caller sets open=false. */
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Action buttons. DOM order is Cancel then primary; CSS shows the primary first at 390 and last on desktop. */
  footer?: ReactNode;
  /** Learn Lines dialogs use the paper surface. */
  paper?: boolean;
  /** Backdrop click closes by default; turn off for confirms that must be answered. */
  dismissOnBackdrop?: boolean;
};

const FIRST_FIELD = "input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [data-autofocus]";

/**
 * Native <dialog> opened with showModal(): focus trap, Esc, inert background and top layer come
 * from the browser (design spec 03 section 11). Focus lands on a [data-autofocus] element, else the first field (or the heading) and
 * returns to the opener on close.
 */
export default function Modal({ open, onClose, title, children, footer, paper = false, dismissOnBackdrop = true }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      // An explicit data-autofocus anywhere in the dialog (e.g. Cancel in a destructive confirm) wins.
      const explicit = dialog.querySelector<HTMLElement>("[data-autofocus]");
      const body = dialog.querySelector<HTMLElement>(".al-modal__body");
      const first = body?.querySelector<HTMLElement>(FIRST_FIELD);
      (explicit ?? first ?? headingRef.current)?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Fires for every close: Esc, dialog.close(), and the close button. Hands control back to the caller
  // and returns focus to whatever opened the dialog.
  const handleClose = () => {
    const opener = openerRef.current;
    openerRef.current = null;
    if (opener?.isConnected) opener.focus();
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="al-modal"
      aria-labelledby={titleId}
      data-surface={paper ? "paper" : undefined}
      onClose={handleClose}
      onClick={(e) => {
        // A click on the ::backdrop reports the dialog itself as the target (the panel is inset by padding).
        if (dismissOnBackdrop && e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      <div className="al-modal__panel">
        <div className="al-modal__head">
          <h2 id={titleId} ref={headingRef} tabIndex={-1} className="al-modal__title">
            {title}
          </h2>
          <IconButton label="Close" onClick={() => dialogRef.current?.close()}>
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 5l12 12M17 5L5 17" />
            </svg>
          </IconButton>
        </div>
        <div className="al-modal__body">{children}</div>
        {footer ? <div className="al-modal__footer">{footer}</div> : null}
      </div>
    </dialog>
  );
}

/** Destructive or irreversible confirm: always pair a destructive button with this step. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
  busy = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      dismissOnBackdrop={false}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy} data-autofocus={destructive ? "" : undefined}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? "destructive" : "primary"} onClick={onConfirm} busy={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p>{description}</p>
    </Modal>
  );
}
