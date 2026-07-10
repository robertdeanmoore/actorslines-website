import type { LineExport } from "../../../lib/learnLines/types";

interface StageDirectionRowProps {
  line: LineExport;
}

export default function StageDirectionRow({ line }: StageDirectionRowProps) {
  return (
    <p
      className="paperkit-script italic text-sm px-5 py-1"
      style={{ color: "var(--color-paperkit-graphite)" }}
    >
      {line.teachPauseMs != null && <span className="mr-1">⏱</span>}
      {line.text}
    </p>
  );
}
