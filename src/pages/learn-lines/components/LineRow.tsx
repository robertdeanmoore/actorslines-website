import { useMemo, useRef } from "react";
import type { LineExport, RevealMode } from "../../../lib/learnLines/types";
import { hiddenRanges, nonParentheticalSpans } from "../../../lib/learnLines/revealRanges";
import { zoneModeForTap } from "../../../lib/learnLines/zoneTap";
import { inkColorFor } from "../../../lib/learnLines/characterColor";
import RedactedText from "./RedactedText";
import PencilScribbleOverlay from "./PencilScribbleOverlay";

interface LineRowProps {
  line: LineExport;
  lineKey: string;
  isUserLine: boolean;
  characterColorIndex: number;
  revealMode: RevealMode;
  shownWordIndices: ReadonlySet<number> | undefined;
  onTap: (zoneMode: RevealMode) => void;
}

export default function LineRow({
  line,
  lineKey,
  isUserLine,
  characterColorIndex,
  revealMode,
  shownWordIndices,
  onTap,
}: LineRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const nameColor = useMemo(() => inkColorFor(characterColorIndex), [characterColorIndex]);

  const hidden = useMemo(
    () => (isUserLine ? hiddenRanges(line.text, revealMode, shownWordIndices) : []),
    [isUserLine, line.text, revealMode, shownWordIndices],
  );
  const highlightSpans = useMemo(
    () => (isUserLine ? nonParentheticalSpans(line.text) : []),
    [isUserLine, line.text],
  );
  const redrawKey = hidden.map((s) => s.join("-")).join(",");

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!isUserLine) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const zoneMode = zoneModeForTap(e.clientX - rect.left, rect.width);
    onTap(zoneMode);
  }

  return (
    <div
      ref={rowRef}
      onClick={handleClick}
      className={`relative py-1 px-1 -mx-1 rounded ${isUserLine ? "cursor-pointer min-h-11" : ""}`}
    >
      <p className="paperkit-script text-base leading-relaxed" style={{ color: "var(--color-paperkit-ink)" }}>
        <span className="font-semibold uppercase" style={{ color: nameColor }}>
          {line.speaker}
        </span>
        {": "}
        {isUserLine ? (
          highlightSpans.map(([s, e], i) => (
            <span
              key={i}
              style={{
                backgroundColor: "var(--color-paperkit-highlighter)",
                opacity: 0.55,
                boxDecorationBreak: "clone",
                WebkitBoxDecorationBreak: "clone",
                borderRadius: "4px",
                padding: "1px 2px",
              }}
            >
              <RedactedText text={line.text.slice(s, e)} hidden={shiftSpans(hidden, s, e)} />
            </span>
          ))
        ) : (
          <span>{line.text}</span>
        )}
      </p>
      {isUserLine && hidden.length > 0 && (
        <PencilScribbleOverlay containerRef={rowRef} seed={lineKey} redrawKey={redrawKey} />
      )}
    </div>
  );
}

/** Re-bases hidden spans (in the full-text coordinate space) onto a highlight-segment's own
 *  local [0, e-s) coordinate space, keeping only the overlap with [s, e). */
function shiftSpans(spans: [number, number][], s: number, e: number): [number, number][] {
  const out: [number, number][] = [];
  for (const [a, b] of spans) {
    const clampedA = Math.max(a, s);
    const clampedB = Math.min(b, e);
    if (clampedA < clampedB) out.push([clampedA - s, clampedB - s]);
  }
  return out;
}
