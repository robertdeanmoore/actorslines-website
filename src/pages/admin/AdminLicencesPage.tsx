import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import type { ProductCode, RedemptionCode } from "../../lib/types";
import { PRODUCT_LABELS } from "../../lib/types";
import { formatDate } from "../../lib/entitlements";

interface UserResult {
  id: string;
  email: string;
  display_name: string;
  role: "user" | "admin";
}

const MINTABLE_PRODUCTS: ProductCode[] = ["single_play_6mo", "unlimited_6mo", "comp_rolling", "admin_full"];

export default function AdminLicencesPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);

  const [codes, setCodes] = useState<RedemptionCode[]>([]);
  const [mintProduct, setMintProduct] = useState<ProductCode>("single_play_6mo");
  const [mintExpires, setMintExpires] = useState("");
  const [mintMaxUses, setMintMaxUses] = useState(1);
  const [minting, setMinting] = useState(false);
  const [mintedPlaintext, setMintedPlaintext] = useState("");

  async function loadCodes() {
    const { data } = await supabase
      .from("redemption_codes")
      .select("id, code_hint, product_code, expires_at, max_uses, redeemed_count, created_at")
      .order("created_at", { ascending: false });
    setCodes((data as RedemptionCode[]) ?? []);
  }

  useEffect(() => {
    void loadCodes();
  }, []);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    const { data } = await supabase.rpc("admin_search_users", { p_query: query.trim() });
    setResults((data as UserResult[]) ?? []);
    setSearching(false);
  }

  async function mintCode(e: React.FormEvent) {
    e.preventDefault();
    setMinting(true);
    setMintedPlaintext("");
    const { data, error } = await supabase.rpc("admin_create_redemption_code", {
      p_product: mintProduct,
      p_expires: mintExpires ? new Date(mintExpires).toISOString() : null,
      p_max_uses: mintMaxUses,
    });
    setMinting(false);
    if (error) {
      setMintedPlaintext("");
      return;
    }
    setMintedPlaintext(data as string);
    await loadCodes();
  }

  const card = "bg-white rounded-xl shadow-sm p-6";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="flex-1 text-2xl font-bold text-brand">Box office — licences</h1>
        <Link to="/admin" className="text-sm text-brand hover:underline">← Request queue</Link>
      </div>

      <div className={card}>
        <h2 className="font-semibold text-gray-900">Find a user</h2>
        <p className="mt-1 text-xs text-gray-500">
          Search by email or display name, then open their licence page to grant or revoke.
        </p>
        <form onSubmit={search} className="mt-4 flex gap-2">
          <input
            placeholder="name@example.com"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            disabled={searching}
            className="rounded-md bg-brand text-white px-4 py-2 text-sm font-semibold hover:bg-brand-light disabled:opacity-50"
          >
            {searching ? "Searching…" : "Search"}
          </button>
        </form>
        {results.length > 0 && (
          <div className="mt-4 space-y-1">
            {results.map((u) => (
              <Link
                key={u.id}
                to={`/admin/licences/${u.id}`}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-gray-100"
              >
                <span className="flex-1 font-medium text-gray-900">{u.display_name || "(no name)"}</span>
                <span className="text-gray-500">{u.email}</span>
                {u.role === "admin" && (
                  <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">admin</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className={card}>
        <h2 className="font-semibold text-gray-900">Redemption codes</h2>
        <p className="mt-1 text-xs text-gray-500">
          Under Codes-first, this is the actual sales mechanism — payment arrives by any means,
          mint a code, hand it to the buyer. The plaintext is shown exactly once.
        </p>
        <form onSubmit={mintCode} className="mt-4 flex flex-wrap items-end gap-2">
          <label className="text-xs text-gray-600">
            Product
            <select
              value={mintProduct}
              onChange={(e) => setMintProduct(e.target.value as ProductCode)}
              className="mt-1 block rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              {MINTABLE_PRODUCTS.map((p) => (
                <option key={p} value={p}>{PRODUCT_LABELS[p]}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-gray-600">
            Expires (optional)
            <input
              type="date"
              value={mintExpires}
              onChange={(e) => setMintExpires(e.target.value)}
              className="mt-1 block rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs text-gray-600">
            Max uses
            <input
              type="number"
              min={1}
              value={mintMaxUses}
              onChange={(e) => setMintMaxUses(Number(e.target.value))}
              className="mt-1 block w-20 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </label>
          <button
            disabled={minting}
            className="rounded-md bg-brand text-white px-4 py-2 text-sm font-semibold hover:bg-brand-light disabled:opacity-50"
          >
            {minting ? "Minting…" : "Mint code"}
          </button>
        </form>
        {mintedPlaintext && (
          <div className="mt-3 flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm">
            <code className="flex-1 font-mono tracking-widest">{mintedPlaintext}</code>
            <button
              onClick={() => navigator.clipboard.writeText(mintedPlaintext)}
              className="text-xs font-semibold text-brand hover:underline"
            >
              Copy
            </button>
            <span className="text-xs text-amber-700">shown once — copy it now</span>
          </div>
        )}

        <div className="mt-4 space-y-1">
          {codes.map((c) => (
            <div key={c.id} className="flex items-center gap-3 border-b border-gray-100 py-2 text-sm last:border-0">
              <code className="text-gray-500">…{c.code_hint}</code>
              <span className="flex-1 font-medium text-gray-900">{PRODUCT_LABELS[c.product_code]}</span>
              <span className="text-gray-500">{c.redeemed_count}/{c.max_uses} used</span>
              <span className="text-gray-500">{c.expires_at ? `expires ${formatDate(c.expires_at)}` : "no expiry"}</span>
            </div>
          ))}
          {codes.length === 0 && <p className="text-sm text-gray-500">No codes minted yet.</p>}
        </div>
      </div>
    </div>
  );
}
