import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../auth/AuthContext";
import type { LearnScriptSummary, PlayExport } from "../../lib/learnLines/types";
import UploadDialog from "./components/UploadDialog";

export default function LearnScriptsPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [scripts, setScripts] = useState<LearnScriptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    void loadScripts();
  }, [session]);

  async function loadScripts() {
    if (!session) return;
    const { data } = await supabase
      .from("learn_scripts")
      .select("id, title, my_character_name, updated_at")
      .eq("user_id", session.user.id)
      .order("updated_at", { ascending: false });
    setScripts((data as LearnScriptSummary[]) ?? []);
    setLoading(false);
  }

  async function handleImport(data: PlayExport, myCharacterName: string) {
    const { data: row, error } = await supabase
      .from("learn_scripts")
      .insert({
        user_id: session!.user.id,
        title: data.title?.trim() || "Untitled",
        schema_version: data.schemaVersion,
        my_character_name: myCharacterName,
        data,
      })
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Could not save the script.");
    navigate(`/learn-lines/${row.id}`);
  }

  async function handleDelete(id: number) {
    if (!confirm("Remove this script? This can't be undone.")) return;
    await supabase.from("learn_scripts").delete().eq("id", id);
    setScripts((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand">Learn Lines</h1>
        <button
          onClick={() => setUploadOpen(true)}
          className="rounded-md bg-brand text-white px-4 py-2 text-sm font-semibold hover:bg-brand-light"
        >
          + Upload script
        </button>
      </div>
      <p className="mt-2 text-sm text-gray-600">
        Import the same JSON file Actors Voice exports for cast distribution, then practice
        hiding and revealing your lines right here in the browser.
      </p>

      <div className="mt-6 space-y-3">
        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {!loading && scripts.length === 0 && (
          <p className="text-sm text-gray-500">
            No scripts yet — upload a cast-export JSON to get started.
          </p>
        )}
        {scripts.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-3 bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow"
          >
            <Link to={`/learn-lines/${s.id}`} className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">{s.title}</div>
              <div className="text-xs text-gray-400">
                Playing {s.my_character_name} · {new Date(s.updated_at).toLocaleDateString()}
              </div>
            </Link>
            <button
              onClick={() => handleDelete(s.id)}
              className="text-xs text-gray-400 hover:text-red-600 px-2 py-1"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {uploadOpen && (
        <UploadDialog onClose={() => setUploadOpen(false)} onImport={handleImport} />
      )}
    </div>
  );
}
