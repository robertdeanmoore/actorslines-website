import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { fetchMyLicences, formatDate, formatPence } from "../../lib/entitlements";
import type { Licence } from "../../lib/types";
import { PRODUCT_LABELS } from "../../lib/types";

const REDEEM_ERROR_COPY: Record<string, string> = {
  bad_request: "Enter a code first.",
  code_invalid: "That code doesn't look right — check for typos.",
  code_expired: "That code has expired.",
  code_exhausted: "That code has already been fully used.",
  server_error: "Something went wrong redeeming that code — try again shortly.",
};

function currentLicence(licences: Licence[]): Licence | null {
  const now = Date.now();
  const active = licences.filter((l) => l.status === "active" && new Date(l.ends_at).getTime() > now);
  if (active.length === 0) return null;
  // Mirrors entitlements_for()'s tie-break: no per-row rank here, so just the latest ends_at.
  return active.sort((a, b) => new Date(b.ends_at).getTime() - new Date(a.ends_at).getTime())[0];
}

export default function LicencePanel() {
  const [licences, setLicences] = useState<Licence[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [message, setMessage] = useState("");

  async function reload() {
    setLicences(await fetchMyLicences());
    setLoading(false);
  }

  useEffect(() => {
    void reload();
  }, []);

  async function redeem(e: React.FormEvent) {
    e.preventDefault();
    setRedeeming(true);
    setMessage("");
    const { data, error } = await supabase.functions.invoke("redeem-code", { body: { code } });
    setRedeeming(false);
    if (error) {
      // Supabase JS surfaces edge-function non-2xx as a generic error; the {code,message} body
      // is on error.context -- fall back to a generic message if that shape isn't there.
      const body = (error as { context?: { json?: () => Promise<{ code?: string }> } }).context;
      const bodyJson = body?.json ? await body.json().catch(() => undefined) : undefined;
      const errCode = bodyJson?.code;
      setMessage(REDEEM_ERROR_COPY[errCode ?? ""] ?? "That code didn't work — try again.");
      return;
    }
    const label = (data as { label?: string })?.label ?? "your new tier";
    setMessage(`Redeemed! You're now on ${label}.`);
    setCode("");
    await reload();
  }

  const current = currentLicence(licences);
  const card = "bg-white rounded-xl shadow-sm p-6";

  return (
    <div className="space-y-6">
      <div className={card}>
        <h2 className="font-semibold text-brand">Your licence</h2>
        {loading ? (
          <p className="mt-2 text-sm text-gray-500">Loading…</p>
        ) : current ? (
          <div className="mt-2 text-sm text-gray-700">
            <p>
              <span className="font-semibold">{PRODUCT_LABELS[current.product_code]}</span>
              {" — access until "}
              {formatDate(current.ends_at)}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-600">
            Free tier — no active paid licence. Got a code? Redeem it below.
          </p>
        )}
      </div>

      <div className={card}>
        <h2 className="font-semibold text-brand">Redeem a code</h2>
        <p className="mt-1 text-xs text-gray-500">
          Purchases happen off-site for now (see actorslines.app for how to buy) — once you have a
          code, enter it here.
        </p>
        {message && <p className="mt-3 text-sm text-brand">{message}</p>}
        <form onSubmit={redeem} className="mt-4 flex gap-2">
          <input
            required
            placeholder="AL-XXXX-XXXX"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm uppercase tracking-widest"
          />
          <button
            disabled={redeeming}
            className="rounded-md bg-brand text-white px-4 py-2 text-sm font-semibold hover:bg-brand-light disabled:opacity-50"
          >
            {redeeming ? "Redeeming…" : "Redeem"}
          </button>
        </form>
      </div>

      {licences.length > 0 && (
        <div className={card}>
          <h2 className="font-semibold text-brand">Licence history</h2>
          <div className="mt-3 space-y-2">
            {licences.map((l) => (
              <div key={l.id} className="flex items-center gap-3 text-sm border-b border-gray-100 pb-2 last:border-0">
                <span className="flex-1 font-medium text-gray-900">{PRODUCT_LABELS[l.product_code]}</span>
                <span className="text-gray-500">
                  {formatDate(l.starts_at)} – {formatDate(l.ends_at)}
                </span>
                {l.price_paid_pence != null && (
                  <span className="text-gray-500">{formatPence(l.price_paid_pence)}</span>
                )}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    l.status === "active"
                      ? "bg-green-100 text-green-800"
                      : l.status === "revoked"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {l.status === "revoked" ? "Revoked — contact support" : l.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
