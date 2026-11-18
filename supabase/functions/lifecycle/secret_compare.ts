// DEF563 (lifecycle half): constant-time shared-secret compare. Pattern approved by Holly
// (WIP #263 rulings, 2026-11-17): HMAC both values under a per-isolate random key (Web Crypto,
// no dependency), then XOR-compare the two fixed-length digests, so neither content nor length
// of the secret shows in the timing. Lives beside index.ts, imported the same way delete_user.ts
// is, so `supabase functions deploy lifecycle` bundles it with the function.

const key = await crypto.subtle.generateKey({ name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
const enc = new TextEncoder();

async function digest(s: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(s)));
}

/** Constant-time for equal-length digests; false when either side is missing or empty. */
export async function secretMatches(
  provided: string | null | undefined,
  expected: string | null | undefined,
): Promise<boolean> {
  if (!provided || !expected) return false; // fail closed, never match two empties
  const [a, b] = await Promise.all([digest(provided), digest(expected)]);
  let diff = a.length ^ b.length;
  for (let i = 0; i < a.length && i < b.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
