import type { LineExport } from "../../../lib/learnLines/types";

interface CueRowProps {
  line: LineExport;
  kind: "SOUND" | "LIGHT";
}

/** Shared row for SOUND and LIGHT cue lines — both reuse LineExport.soundDescription, just
 *  with different fallback text and icon (mirrors PaperSoundEffectRow/PaperLightCueRow). */
export default function CueRow({ line, kind }: CueRowProps) {
  const fallback = kind === "SOUND" ? "Sound effect" : "Lighting cue";
  const label = line.soundDescription?.trim() || fallback;
  const icon = kind === "SOUND" ? "🎵" : "💡";
  return (
    <p
      className="paperkit-script italic text-sm text-center py-1"
      style={{ color: "var(--color-paperkit-graphite)" }}
    >
      <span className="mr-1">{icon}</span>({label})
    </p>
  );
}
