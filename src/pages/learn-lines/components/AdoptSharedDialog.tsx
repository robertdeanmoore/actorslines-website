import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../auth/AuthContext";
import type { PlayExport } from "../../../lib/learnLines/types";
import CharacterPickerDialog from "./CharacterPickerDialog";

interface SharedScriptItem {
  shareId: number;
  scriptId: number;
  title: string;
  sharedByName: string;
  data: PlayExport;
}

interface AdoptSharedDialogProps {
  onClose: () => void;
  onImport: (data: PlayExport, myCharacterName: string) => Promise<void>;
}

/** Lists scripts another registered user has shared with the current user, and lets them
 *  adopt one — reuses the same CharacterPickerDialog + onImport path as a fresh upload, so
 *  the result is an independent learn_scripts row of their own (adopting again later makes
 *  another independent copy, by design). */
export default function AdoptSharedDialog({ onClose, onImport }: AdoptSharedDialogProps) {
  const { session } = useAuth();
  const [items, setItems] = useState<SharedScriptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SharedScriptItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    if (!session) return;
    const { data: shareRows } = await supabase
      .from("learn_script_shares")
      .select("id, script_id, shared_by")
      .eq("shared_with", session.user.id)
      .order("created_at", { ascending: false });
    const shares = shareRows ?? [];
    if (shares.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    const scriptIds = [...new Set(shares.map((s) => s.script_id))];
    const sharerIds = [...new Set(shares.map((s) => s.shared_by))];
    const [{ data: scriptRows }, { data: sharerRows }] = await Promise.all([
      supabase.from("learn_scripts").select("id, title, data").in("id", scriptIds),
      supabase.from("public_profiles").select("id, display_name").in("id", sharerIds),
    ]);
    const scriptById = new Map((scriptRows ?? []).map((r) => [r.id, r]));
    const nameById = new Map((sharerRows ?? []).map((r) => [r.id, r.display_name]));

    setItems(
      shares
        .map((s) => {
          const script = scriptById.get(s.script_id);
          if (!script) return null;
          return {
            shareId: s.id,
            scriptId: s.script_id,
            title: script.title,
            sharedByName: nameById.get(s.shared_by) || "A cast member",
            data: script.data as PlayExport,
          };
        })
        .filter((x): x is SharedScriptItem => x !== null),
    );
    setLoading(false);
  }

  async function handleConfirm(characterName: string) {
    if (!selected) return;
    setBusy(true);
    try {
      await onImport(selected.data, characterName);
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Something went wrong saving the script.");
      setSelected(null);
    }
  }

  if (selected) {
    return (
      <CharacterPickerDialog
        characters={selected.data.characters}
        busy={busy}
        onConfirm={handleConfirm}
        onCancel={() => (busy ? undefined : setSelected(null))}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm max-h-[80vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-brand">Adopt a shared script</h2>
        <p className="text-xs text-gray-500 mt-1">
          Scripts a cast member has shared with you. Choosing one creates your own copy so
          you can pick your character and hide/show your own lines.
        </p>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-4 space-y-2">
          {loading && <p className="text-sm text-gray-500">Loading…</p>}
          {!loading && items.length === 0 && (
            <p className="text-sm text-gray-500">Nothing's been shared with you yet.</p>
          )}
          {items.map((item) => (
            <button
              key={item.shareId}
              onClick={() => setSelected(item)}
              className="w-full text-left rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50"
            >
              <div className="text-sm font-medium text-gray-900 truncate">{item.title}</div>
              <div className="text-xs text-gray-500">Shared by {item.sharedByName}</div>
            </button>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
