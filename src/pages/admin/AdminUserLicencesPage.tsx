import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { fetchEntitlementsFor, formatDate } from "../../lib/entitlements";
import type { EntitlementsResult, Licence, LicenceAuditRow, ProductCode } from "../../lib/types";
import { PRODUCT_LABELS } from "../../lib/types";

// Product select must list inactive products too (comp_rolling, admin_full, the inert group
// products) -- that's what makes them grantable with no extra UI, and what lets a company be
// served by hand long before Phase 7 exists. Mark the grant-only ones visibly.
const ALL_PRODUCTS: { code: ProductCode; grantOnly?: boolean }[] = [
  { code: "single_play_6mo" },
  { code: "unlimited_6mo" },
  { code: "group_member", grantOnly: true },
  { code: "group_master", grantOnly: true },
  { code: "comp_rolling", grantOnly: true },
  { code: "admin_full", grantOnly: true },
];

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const PRESETS = [
  { label: "1 week full (show-week emergency)", product: "admin_full" as ProductCode, endDate: addDays(7) },
  { label: "6 months Single-Play", product: "single_play_6mo" as ProductCode, endDate: addDays(180) },
  { label: "6 months Unlimited", product: "unlimited_6mo" as ProductCode, endDate: addDays(180) },
];

export default function AdminUserLicencesPage() {
  const { userId } = useParams();
  const [entitlements, setEntitlements] = useState<EntitlementsResult | null>(null);
  const [licences, setLicences] = useState<Licence[]>([]);
  const [audit, setAudit] = useState<LicenceAuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [product, setProduct] = useState<ProductCode>("single_play_6mo");
  const [endDate, setEndDate] = useState(addDays(180));
  const [granting, setGranting] = useState(false);

  async function reload() {
    if (!userId) return;
    setEntitlements(await fetchEntitlementsFor(userId));
    const { data: licenceRows } = await supabase
      .from("licences")
      .select("*")
      .eq("user_id", userId)
      .order("starts_at", { ascending: false });
    const rows = (licenceRows as Licence[]) ?? [];
    setLicences(rows);

    const licenceIds = rows.map((l) => l.id);
    const { data: auditRows } = await supabase
      .from("licence_audit")
      .select("*")
      .or([`actor.eq.${userId}`, licenceIds.length > 0 ? `licence_id.in.(${licenceIds.join(",")})` : "licence_id.eq.-1"].join(","))
      .order("created_at", { ascending: false })
      .limit(50);
    setAudit((auditRows as LicenceAuditRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void reload();
  }, [userId]);

  async function grant(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setGranting(true);
    setMessage("");
    const { error } = await supabase.rpc("admin_grant_licence", {
      p_user: userId,
      p_product: product,
      p_starts: new Date().toISOString(),
      p_ends: new Date(endDate).toISOString(),
      p_note: null,
    });
    setGranting(false);
    setMessage(error ? error.message : `Granted ${PRODUCT_LABELS[product]} until ${endDate}.`);
    if (!error) await reload();
  }

  async function applyPreset(preset: (typeof PRESETS)[number]) {
    setProduct(preset.product);
    setEndDate(preset.endDate);
  }

  async function revoke(licenceId: number) {
    const reason = window.prompt("Reason for revoking (at least 3 characters):");
    if (reason === null) return;
    const { error } = await supabase.rpc("admin_revoke_licence", { p_licence_id: licenceId, p_reason: reason });
    setMessage(error ? error.message : "Revoked.");
    if (!error) await reload();
  }

  const card = "bg-white rounded-xl shadow-sm p-6";

  if (loading) return <p className="p-8 text-center text-gray-500">Loading…</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="flex-1 text-2xl font-bold text-brand">User licences</h1>
        <Link to="/admin/licences" className="text-sm text-brand hover:underline">← Search</Link>
      </div>

      <div className={card}>
        <h2 className="font-semibold text-gray-900">Current entitlement</h2>
        <p className="mt-2 text-sm text-gray-700">
          <span className="font-semibold">{entitlements?.tierLabel ?? "Free"}</span>
          {entitlements?.licenceEndsAtEpochMs && (
            <> — until {formatDate(new Date(entitlements.licenceEndsAtEpochMs).toISOString())}</>
          )}
        </p>
      </div>

      <div className={card}>
        <h2 className="font-semibold text-gray-900">Grant a licence</h2>
        {message && <p className="mt-2 text-sm text-brand">{message}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className="rounded-md bg-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-300"
            >
              {p.label}
            </button>
          ))}
        </div>
        <form onSubmit={grant} className="mt-4 flex flex-wrap items-end gap-2">
          <label className="text-xs text-gray-600">
            Product
            <select
              value={product}
              onChange={(e) => setProduct(e.target.value as ProductCode)}
              className="mt-1 block rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              {ALL_PRODUCTS.map((p) => (
                <option key={p.code} value={p.code}>
                  {PRODUCT_LABELS[p.code]}{p.grantOnly ? " (grant-only)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-gray-600">
            Ends
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </label>
          <button
            disabled={granting}
            className="rounded-md bg-brand text-white px-4 py-2 text-sm font-semibold hover:bg-brand-light disabled:opacity-50"
          >
            {granting ? "Granting…" : "Grant"}
          </button>
        </form>
      </div>

      <div className={card}>
        <h2 className="font-semibold text-gray-900">Licences</h2>
        <div className="mt-3 space-y-2">
          {licences.map((l) => (
            <div key={l.id} className="flex items-center gap-3 border-b border-gray-100 py-2 text-sm last:border-0">
              <span className="flex-1 font-medium text-gray-900">{PRODUCT_LABELS[l.product_code]}</span>
              <span className="text-gray-500">{formatDate(l.starts_at)} – {formatDate(l.ends_at)}</span>
              <span className="text-gray-400">{l.source}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  l.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"
                }`}
              >
                {l.status}
              </span>
              {l.status === "active" && (
                <button onClick={() => revoke(l.id)} className="text-xs text-red-600 hover:underline">
                  Revoke
                </button>
              )}
            </div>
          ))}
          {licences.length === 0 && <p className="text-sm text-gray-500">No licences yet.</p>}
        </div>
      </div>

      <div className={card}>
        <h2 className="font-semibold text-gray-900">Audit (last 50)</h2>
        <div className="mt-3 space-y-1">
          {audit.map((a) => (
            <div key={a.id} className="flex items-center gap-3 text-xs text-gray-600">
              <span className="w-16 font-medium">{a.action}</span>
              <span className="flex-1 text-gray-400">{a.via ?? "—"}</span>
              <span>{new Date(a.created_at).toLocaleString()}</span>
            </div>
          ))}
          {audit.length === 0 && <p className="text-sm text-gray-500">No audit entries yet.</p>}
        </div>
      </div>
    </div>
  );
}
