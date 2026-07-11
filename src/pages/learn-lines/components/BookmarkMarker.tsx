interface BookmarkMarkerProps {
  label: string;
  onClick: () => void;
}

/** The in-list bookmark chip, dropped between two lines — mirrors the app's section/speech
 *  chip styling (small rounded pill, tinted brand colour, thin divider rule) from PaperSection.kt. */
export default function BookmarkMarker({ label, onClick }: BookmarkMarkerProps) {
  return (
    <div className="flex items-center gap-2 py-1">
      <button
        onClick={onClick}
        className="rounded px-2 py-0.5 text-[11px] font-semibold shrink-0 hover:opacity-80"
        style={{
          backgroundColor: "color-mix(in oklch, var(--color-brand-600) 12%, transparent)",
          color: "var(--color-brand-600)",
        }}
      >
        🔖 {label}
      </button>
      <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-paperkit-bg-deep)" }} />
    </div>
  );
}
