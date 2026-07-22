// Run with `deno test` (not wired into CI yet -- see docs/plans/actorslines-website-progress.md).
// Exercises buildClaims + the sign/verify round trip in isolation from Deno.serve/env/Supabase.

import { assertEquals, assertExists } from "jsr:@std/assert@1";
import { exportPKCS8, generateKeyPair, importPKCS8, jwtVerify } from "npm:jose@5";
import { buildClaims, CLAIM_VERSION, signEntitlementToken, signSunsetDeclaration, TOKEN_TTL_SECONDS } from "./token.ts";

const NOW = 1_800_000_000;

Deno.test("buildClaims: paid licence includes lic_exp", () => {
  const claims = buildClaims("user-1", { ent: { canRunScenes: true }, tier_label: "Unlimited", licence_ends_at_epoch_ms: 1_900_000_000_000 }, NOW);
  assertEquals(claims.sub, "user-1");
  assertEquals(claims.iat, NOW);
  assertEquals(claims.exp, NOW + TOKEN_TTL_SECONDS);
  assertEquals(claims.ver, CLAIM_VERSION);
  assertEquals(claims.lic_exp, 1_900_000_000);
  assertExists(claims.jti);
});

Deno.test("buildClaims: Free (no licence) omits lic_exp entirely, not null", () => {
  const claims = buildClaims("user-2", { ent: { canRunScenes: false }, tier_label: "Free", licence_ends_at_epoch_ms: null }, NOW);
  assertEquals("lic_exp" in claims, false);
});

Deno.test("sign/verify round trip: a token this function signs is accepted by jose's own verifier", async () => {
  const { privateKey, publicKey } = await generateKeyPair("ES256", { extractable: true });
  const pkcs8Pem = await exportPKCS8Like(privateKey);
  const pkcs8Base64 = btoa(pkcs8Pem);

  const claims = buildClaims("user-3", { ent: { canRunScenes: true }, tier_label: "Unlimited", licence_ends_at_epoch_ms: null }, NOW);
  const token = await signEntitlementToken(claims, "test-kid", pkcs8Base64);

  const { payload, protectedHeader } = await jwtVerify(token, publicKey);
  assertEquals(protectedHeader.kid, "test-kid");
  assertEquals(payload.sub, "user-3");
  assertEquals(payload.ver, CLAIM_VERSION);
});

Deno.test("sunset declaration: no exp claim by design", async () => {
  const { privateKey, publicKey } = await generateKeyPair("ES256", { extractable: true });
  const pkcs8Pem = await exportPKCS8Like(privateKey);
  const pkcs8Base64 = btoa(pkcs8Pem);

  const token = await signSunsetDeclaration("test-kid", pkcs8Base64, NOW);
  const { payload } = await jwtVerify(token, publicKey, { requiredClaims: ["sunset"] });
  assertEquals(payload.sunset, true);
  assertEquals("exp" in payload, false);
});

// jose's generateKeyPair doesn't directly expose a PKCS8 exporter in one step for CryptoKey ->
// PEM; this small helper round-trips through jose's own exportPKCS8 (which returns the PEM
// string directly), matching what getPrivateKey() in token.ts expects to unwrap via atob().
async function exportPKCS8Like(privateKey: CryptoKey): Promise<string> {
  const pem = await exportPKCS8(privateKey);
  // Sanity: importPKCS8 must accept exactly what we're about to base64-wrap.
  await importPKCS8(pem, "ES256");
  return pem;
}
