import { useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../auth/AuthContext";

interface ShareScriptDialogProps {
  scriptId: number;
  onClose: () => void;
}

type ShareResult = "shared" | "already_shared" | "not_found" | "error";

const RESULT_LABEL: Record<ShareResult, string> = {
  shared: "Shared",
  already_shared: "Already shared with them",
  not_found: "No registered user with that email",
  error: "Something went wrong",
};

export default function ShareScriptDialog({ scriptId, onClose }: ShareScriptDialogProps) {
  const { session } = useAuth();
  const [emails, setEmails] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Record<string, ShareResult>>({});

  function addEmail() {
    const email = input.trim().toLowerCase();
    if (!email || !email.includes("@")) return;
    if (!emails.includes(email)) setEmails((prev) => [...prev, email]);
    setInput("");
  }

  function removeEmail(email: string) {
    setEmails((prev) => prev.filter((e) => e !== email));
    setResults((prev) => {
      const next = { ...prev };
      delete next[email];
      return next;
    });
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addEmail();
    }
  }

  async function share() {
    addEmail(); // catch anything left typed but not yet added
    const targets = input.trim() ? [...emails, input.trim().toLowerCase()] : emails;
    if (targets.length === 0) return;
    setBusy(true);
    setInput("");

    const nextResults: Record<string, ShareResult> = {};
    for (const email of targets) {
      try {
        const { data: userId, error: lookupErr } = await supabase.rpc("find_user_by_email", {
          lookup_email: email,
        });
        if (lookupErr || !userId) {
          nextResults[email] = "not_found";
          continue;
        }
        const { error: shareErr } = await supabase
          .from("learn_script_shares")
          .upsert(
            { script_id: scriptId, shared_by: session!.user.id, shared_with: userId },
            { onConflict: "script_id,shared_with", ignoreDuplicates: true },
          );
        nextResults[email] = shareErr ? "error" : "shared";
      } catch {
        nextResults[email] = "error";
      }
    }
    setEmails(targets);
    setResults(nextResults);
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
        <h2 className="text-lg font-bold text-brand">Share this script</h2>
        <p className="text-xs text-gray-500 mt-1">
          Enter the email each cast member registered with. They'll see it under
          "Adopt shared script" next time they visit Learn Lines.
        </p>

        {emails.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {emails.map((email) => (
              <span
                key={email}
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700"
              >
                {email}
                {results[email] && (
                  <span
                    className={
                      results[email] === "shared" || results[email] === "already_shared"
                        ? "text-green-700"
                        : "text-red-600"
                    }
                  >
                    — {RESULT_LABEL[results[email]]}
                  </span>
                )}
                <button
                  onClick={() => removeEmail(email)}
                  className="text-gray-400 hover:text-gray-700"
                  aria-label={`Remove ${email}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <input
            type="email"
            placeholder="name@example.com"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={addEmail}
            className="rounded-md bg-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
          >
            Add
          </button>
        </div>

        <div className="mt-6 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            disabled={busy || (emails.length === 0 && !input.trim())}
            onClick={share}
            className="px-4 py-2 rounded-md bg-brand text-white text-sm font-semibold hover:bg-brand-light disabled:opacity-50"
          >
            {busy ? "Sharing…" : "Share"}
          </button>
        </div>
      </div>
    </div>
  );
}
