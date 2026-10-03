/** Where one printed page ends and the next begins (WIP #155): italic, centred "Page" between two
 *  rules, styled like a stage direction. Display only. */
export default function PageBreakRow() {
  const rule = { borderColor: "var(--color-paperkit-graphite)", opacity: 0.5 };
  return (
    <div className="flex items-center px-5 py-1" aria-label="Page break">
      <span className="flex-1 border-t" style={rule} />
      <span className="paperkit-script italic text-sm px-3" style={{ color: "var(--color-paperkit-graphite)" }}>
        Page
      </span>
      <span className="flex-1 border-t" style={rule} />
    </div>
  );
}
