import type { Span } from "../../../lib/learnLines/revealRanges";

interface RedactedTextProps {
  text: string;
  hidden: Span[];
}

/** Renders `text` as a run of segment spans, coloring hidden spans transparent (not removing
 *  them) so text layout/wrapping stays identical whether or not a span is concealed — mirrors
 *  the app's approach in PaperStyle.kt. Hidden spans are tagged `data-hidden` so a sibling
 *  `PencilScribbleOverlay` can find their rendered glyph geometry via Range.getClientRects(). */
export default function RedactedText({ text, hidden }: RedactedTextProps) {
  const sorted = [...hidden].sort((a, b) => a[0] - b[0]);
  const segments: { start: number; end: number; hidden: boolean }[] = [];
  let cursor = 0;
  for (const [s, e] of sorted) {
    if (s > cursor) segments.push({ start: cursor, end: s, hidden: false });
    segments.push({ start: Math.max(s, cursor), end: e, hidden: true });
    cursor = Math.max(cursor, e);
  }
  if (cursor < text.length) segments.push({ start: cursor, end: text.length, hidden: false });

  return (
    <>
      {segments.map((seg, i) =>
        seg.hidden ? (
          <span key={i} data-hidden="true" style={{ color: "transparent" }}>
            {text.slice(seg.start, seg.end)}
          </span>
        ) : (
          <span key={i}>{text.slice(seg.start, seg.end)}</span>
        ),
      )}
    </>
  );
}
