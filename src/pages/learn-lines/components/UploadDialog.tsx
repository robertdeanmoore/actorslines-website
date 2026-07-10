import { useRef, useState } from "react";
import { parseImport } from "../../../lib/learnLines/parseImport";
import type { PlayExport } from "../../../lib/learnLines/types";
import CharacterPickerDialog from "./CharacterPickerDialog";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

interface UploadDialogProps {
  onClose: () => void;
  onImport: (data: PlayExport, myCharacterName: string) => Promise<void>;
}

/** Drives the whole upload flow as a modal: pick a file -> parse/validate ->
 *  "who are you playing?" -> hand off the confirmed (data, characterName) pair. */
export default function UploadDialog({ onClose, onImport }: UploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [parsed, setParsed] = useState<PlayExport | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    setError("");
    if (file.size > MAX_FILE_BYTES) {
      setError("That file is larger than expected for a script export — please check it's the right file.");
      return;
    }
    const raw = await file.text();
    const result = parseImport(raw);
    if (!result.ok || !result.data) {
      setError(result.error ?? "This doesn't look like a valid script file.");
      return;
    }
    setParsed(result.data);
  }

  async function handleConfirm(characterName: string) {
    if (!parsed) return;
    setBusy(true);
    try {
      await onImport(parsed, characterName);
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Something went wrong saving the script — please try again.");
      setParsed(null);
    }
  }

  if (parsed) {
    return (
      <CharacterPickerDialog
        characters={parsed.characters}
        busy={busy}
        onConfirm={handleConfirm}
        onCancel={() => (busy ? undefined : setParsed(null))}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
        <h2 className="text-lg font-bold text-brand">Upload a script</h2>
        <p className="mt-2 text-sm text-gray-600">
          Choose the JSON file exported from Actors Voice's "Export for cast" option.
        </p>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
        <div className="mt-6 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-md bg-brand text-white text-sm font-semibold hover:bg-brand-light"
          >
            Choose file…
          </button>
        </div>
      </div>
    </div>
  );
}
