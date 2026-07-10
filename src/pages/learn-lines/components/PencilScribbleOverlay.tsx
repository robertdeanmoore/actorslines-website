import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { drawPencilStroke, hashSeed, mulberry32 } from "../../../lib/learnLines/paperCanvas";

interface PencilScribbleOverlayProps {
  /** Ref to the position:relative block-level line row this canvas should cover. */
  containerRef: RefObject<HTMLElement | null>;
  /** Stable per-line key — seeds the jitter so a line's scribble doesn't reshuffle on
   *  every re-render. */
  seed: string;
  /** Bump this (e.g. a hidden-ranges signature) whenever the redaction changed and a
   *  redraw is needed. */
  redrawKey: string;
}

/** Draws the app's hand-jittered pencil-scribble strokes over every element tagged
 *  `data-hidden="true"` inside `containerRef`, using Range.getClientRects() to find each
 *  hidden span's actual wrapped glyph geometry — the DOM equivalent of Compose's
 *  TextLayoutResult used by PaperStyle.kt's drawPencilOverRanges. */
export default function PencilScribbleOverlay({ containerRef, seed, redrawKey }: PencilScribbleOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    function draw() {
      if (!container || !canvas) return;
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);

      const rand = mulberry32(hashSeed(seed));
      const hiddenSpans = container.querySelectorAll<HTMLElement>('[data-hidden="true"]');
      hiddenSpans.forEach((span) => {
        const textNode = span.firstChild;
        if (!textNode) return;
        const range = document.createRange();
        range.selectNodeContents(textNode);
        const rects = range.getClientRects();
        for (const r of Array.from(rects)) {
          const left = r.left - rect.left;
          const top = r.top - rect.top;
          if (r.width <= 0 || r.height <= 0) continue;
          drawPencilStroke(ctx, rand, left, top + r.height * 0.88, r.width);
        }
        range.detach?.();
      });
    }

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(container);
    document.fonts?.ready?.then(draw).catch(() => {});
    window.addEventListener("resize", draw);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", draw);
    };
    // redrawKey intentionally triggers a re-run when the hidden-range set changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, seed, redrawKey]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" aria-hidden="true" />;
}
