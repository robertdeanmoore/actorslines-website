import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { isNightTheme } from "../../../lib/theme";
import Modal from "../../../components/ui/Modal";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import { LoadingState, EmptyState } from "../../../components/ui/States";

interface SharedWithDialogProps {
  scriptId: number;
  onClose: () => void;
  onChange: () => void;
}

interface ShareRow {
  share_id: number;
  email: string;
  created_at: string;
}

export default function SharedWithDialog({ scriptId, onClose, onChange }: SharedWithDialogProps) {
  const [rows, setRows] = useState<ShareRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<number | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.rpc("list_script_shares", { p_script_id: scriptId });
    setRows((data as ShareRow[]) ?? []);
    setLoading(false);
  }

  async function revoke(shareId: number) {
    setRevokingId(shareId);
    const { error } = await supabase.from("learn_script_shares").delete().eq("id", shareId);
    if (!error) {
      setRows((prev) => prev.filter((r) => r.share_id !== shareId));
      onChange();
    }
    setRevokingId(null);
  }

  if (isNightTheme()) {
    return (
      <Modal
        open
        onClose={onClose}
        title="Shared with"
        paper
        dismissOnBackdrop={false}
        footer={
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        }
      >
        <p className="text-sm">
          Revoking removes their access — it doesn't delete a copy they've already adopted.
        </p>

        <div className="mt-4">
          {loading && <LoadingState label="Loading…" />}
          {!loading && rows.length === 0 && (
            <EmptyState title="Not shared with anyone." headingLevel={3} />
          )}
          {rows.length > 0 && (
            <ul className="al-card-list">
              {rows.map((row) => (
                <Card key={row.share_id} as="li">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm truncate">{row.email}</span>
                    <Button
                      variant="destructive"
                      disabled={revokingId === row.share_id}
                      busy={revokingId === row.share_id}
                      onClick={() => revoke(row.share_id)}
                    >
                      {revokingId === row.share_id ? "Revoking…" : "Revoke"}
                    </Button>
                  </div>
                </Card>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm max-h-[80vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-brand">Shared with</h2>
        <p className="text-xs text-gray-500 mt-1">
          Revoking removes their access — it doesn't delete a copy they've already adopted.
        </p>

        <div className="mt-4 space-y-2">
          {loading && <p className="text-sm text-gray-500">Loading…</p>}
          {!loading && rows.length === 0 && (
            <p className="text-sm text-gray-500">Not shared with anyone.</p>
          )}
          {rows.map((row) => (
            <div
              key={row.share_id}
              className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2"
            >
              <span className="text-sm text-gray-900 truncate">{row.email}</span>
              <button
                disabled={revokingId === row.share_id}
                onClick={() => revoke(row.share_id)}
                className="shrink-0 text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
              >
                {revokingId === row.share_id ? "Revoking…" : "Revoke"}
              </button>
            </div>
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
