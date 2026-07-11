import { useState } from "react";

const MAX_LEN = 20;

interface BookmarkDialogProps {
  mode: "create" | "manage";
  existingLabel?: string;
  onCancel: () => void;
  onSave?: (label: string) => void;
  onDelete?: () => void;
}

/** Small modal for both dropping a new bookmark (label entry, up to 20 chars) and managing an
 *  existing one (delete). Tapping the backdrop cancels, matching ShareScriptDialog's convention. */
export default function BookmarkDialog({ mode, existingLabel, onCancel, onSave, onDelete }: BookmarkDialogProps) {
  const [label, setLabel] = useState("");
  const trimmed = label.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-lg p-5 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
        {mode === "create" ? (
          <>
            <h2 className="text-sm font-bold text-brand">Add bookmark</h2>
            <input
              autoFocus
              type="text"
              maxLength={MAX_LEN}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && trimmed) onSave?.(trimmed);
                if (e.key === "Escape") onCancel();
              }}
              placeholder="Describe this spot…"
              className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="mt-1 text-right text-[11px] text-gray-400">
              {label.length}/{MAX_LEN}
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                disabled={!trimmed}
                onClick={() => onSave?.(trimmed)}
                className="px-4 py-2 rounded-md bg-brand text-white text-sm font-semibold hover:bg-brand-light disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-sm font-bold text-brand">🔖 {existingLabel}</h2>
            <p className="text-xs text-gray-500 mt-1">Delete this bookmark?</p>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={onDelete}
                className="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
