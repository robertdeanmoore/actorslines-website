import { useState } from "react";
import type { CharacterExport } from "../../../lib/learnLines/types";

interface CharacterPickerDialogProps {
  characters: CharacterExport[];
  onConfirm: (characterName: string) => void;
  onCancel: () => void;
  busy?: boolean;
}

/** "Who are you playing?" — required for every import, mirroring the app's forced-choice
 *  gate on cast-distribution import (isMyCharacter is always false in those files). */
export default function CharacterPickerDialog({ characters, onConfirm, onCancel, busy }: CharacterPickerDialogProps) {
  const preselected = characters.find((c) => c.isMyCharacter)?.characterName ?? null;
  const [selected, setSelected] = useState<string | null>(preselected);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm max-h-[80vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-brand">Who are you playing?</h2>
        <p className="text-xs text-gray-500 mt-1">
          Required — pick the character you'll be rehearsing.
        </p>
        <div className="mt-4 space-y-1">
          {characters.map((c) => (
            <label
              key={c.characterName}
              className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-gray-100 cursor-pointer text-sm"
            >
              <input
                type="radio"
                name="character"
                checked={selected === c.characterName}
                onChange={() => setSelected(c.characterName)}
              />
              <span>
                <span className="font-medium text-gray-900">{c.characterName}</span>
                {c.actorName && <span className="text-gray-500"> — {c.actorName}</span>}
              </span>
            </label>
          ))}
        </div>
        <div className="mt-6 flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            disabled={!selected || busy}
            onClick={() => selected && onConfirm(selected)}
            className="px-4 py-2 rounded-md bg-brand text-white text-sm font-semibold hover:bg-brand-light disabled:opacity-50"
          >
            {busy ? "Importing…" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
