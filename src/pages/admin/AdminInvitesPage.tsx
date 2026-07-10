import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import type { Invite } from "../../lib/types";

function inviteStatus(invite: Invite): { label: string; className: string } {
  if (invite.accepted_at) return { label: "Accepted", className: "bg-green-100 text-green-800" };
  if (new Date(invite.expires_at).getTime() < Date.now())
    return { label: "Expired", className: "bg-gray-200 text-gray-600" };
  return { label: "Pending", className: "bg-amber-100 text-amber-800" };
}

export default function AdminInvitesPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadInvites() {
    const { data } = await supabase
      .from("invites").select("*").order("created_at", { ascending: false });
    setInvites((data as Invite[]) ?? []);
    setLoading(false);
  }
  useEffect(() => {
    void loadInvites();
  }, []);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFlash("");
    const { error } = await supabase.functions.invoke("invite", {
      body: { action: "send", email: email.trim() },
    });
    setBusy(false);
    if (error) {
      setFlash(`Failed to send invite: ${error.message}`);
      return;
    }
    setFlash(`Invite sent to ${email.trim()}.`);
    setEmail("");
    void loadInvites();
  }

  const card = "bg-white rounded-xl shadow-sm p-6";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="flex-1 text-2xl font-bold text-brand">Invites</h1>
        <Link to="/admin" className="text-sm text-brand hover:underline">
          ← Request queue
        </Link>
      </div>

      <div className={card}>
        <h2 className="font-semibold text-gray-900">Send an invite</h2>
        <p className="mt-1 text-xs text-gray-500">
          Registration is invite-only. Enter an email to send a single-use sign-up link
          (expires in 14 days). The recipient sets their own password and gets a normal,
          non-admin account.
        </p>
        {flash && <p className="mt-3 text-sm text-gray-700">{flash}</p>}
        <form onSubmit={sendInvite} className="mt-4 flex gap-2">
          <input
            type="email"
            required
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            disabled={busy}
            className="rounded-md bg-brand text-white px-4 py-2 text-sm font-semibold hover:bg-brand-light disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send invite"}
          </button>
        </form>
      </div>

      <div className={card}>
        <h2 className="font-semibold text-gray-900">Sent invites</h2>
        <div className="mt-3 space-y-2">
          {loading && <p className="text-sm text-gray-500">Loading…</p>}
          {!loading && invites.length === 0 && (
            <p className="text-sm text-gray-500">No invites sent yet.</p>
          )}
          {invites.map((invite) => {
            const status = inviteStatus(invite);
            return (
              <div
                key={invite.id}
                className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2"
              >
                <span className="flex-1 text-sm text-gray-900 truncate">{invite.email}</span>
                <span className="text-xs text-gray-400">
                  {new Date(invite.created_at).toLocaleDateString()}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
                  {status.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
