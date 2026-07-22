import { supabase } from "./supabase";
import type { EntitlementsResult, Licence } from "./types";

/** Calls the `entitlements_for` RPC directly (used by admin pages showing another user's
 *  current effective tier) -- reads only, never a substitute for the signed token the app uses. */
export async function fetchEntitlementsFor(userId: string): Promise<EntitlementsResult | null> {
  const { data, error } = await supabase.rpc("entitlements_for", { p_user: userId });
  if (error || !data || data.length === 0) return null;
  const row = data[0] as { ent: EntitlementsResult["entitlements"]; tier_label: string; licence_ends_at_epoch_ms: number | null };
  return {
    tierLabel: row.tier_label,
    licenceEndsAtEpochMs: row.licence_ends_at_epoch_ms,
    entitlements: row.ent,
  };
}

/** The signed-in user's own licence history, newest first -- own-row RLS lets this run as a
 *  plain client-side select, no edge function needed. */
export async function fetchMyLicences(): Promise<Licence[]> {
  const { data, error } = await supabase
    .from("licences")
    .select("*")
    .order("starts_at", { ascending: false });
  if (error) return [];
  return (data as Licence[]) ?? [];
}

export function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** Days remaining until `endsAtIso`, floored at 0 -- never shows a negative countdown. */
export function daysRemaining(endsAtIso: string): number {
  const ms = new Date(endsAtIso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}
