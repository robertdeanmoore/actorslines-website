import { useRef } from "react";

interface BookmarkableRowProps {
  onLongPress: () => void;
  innerRef?: (el: HTMLDivElement | null) => void;
  children: React.ReactNode;
}

const HOLD_MS = 500;
const MOVE_TOLERANCE_PX = 10;

/** Wraps a line row with long-press (touch) / press-and-hold (mouse) detection, without
 *  disturbing the row's own click behaviour (e.g. LineRow's tap-to-reveal zones). A hold past
 *  HOLD_MS fires onLongPress immediately; the resulting synthetic click on release is swallowed
 *  via a capture-phase listener so it never also reaches the row's own onClick. Movement past
 *  MOVE_TOLERANCE_PX cancels the hold so normal list scrolling isn't mistaken for a hold. */
export default function BookmarkableRow({ onLongPress, innerRef, children }: BookmarkableRowProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function handlePointerDown(e: React.PointerEvent) {
    startRef.current = { x: e.clientX, y: e.clientY };
    clearTimer();
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      onLongPress();
    }, HOLD_MS);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!startRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (Math.hypot(dx, dy) > MOVE_TOLERANCE_PX) clearTimer();
  }

  function handlePointerUp() {
    clearTimer();
  }

  function handleClickCapture(e: React.MouseEvent) {
    if (firedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      firedRef.current = false;
    }
  }

  return (
    <div
      ref={innerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
      onClickCapture={handleClickCapture}
      className="select-none"
    >
      {children}
    </div>
  );
}
