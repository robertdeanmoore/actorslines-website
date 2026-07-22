// Pure claim-building + signing logic for the entitlement token, kept separate from index.ts's
// HTTP/auth wiring so it's testable in isolation (see token_test.ts). No Deno.serve/env reads here.

import { SignJWT, importPKCS8 } from "npm:jose@5";

export const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days -- docs/monetization/rules.md constants registry
export const CLAIM_VERSION = 1;

export interface EntitlementsRow {
  ent: Record<string, unknown>;
  tier_label: string;
  licence_ends_at_epoch_ms: number | null;
}

export interface EntitlementClaims {
  sub: string;
  iat: number;
  exp: number;
  jti: string;
  ver: number;
  ent: Record<string, unknown>;
  lic_exp?: number;
}

/** Builds the claim payload for a user's current entitlements row (from `entitlements_for()`). */
export function buildClaims(userId: string, row: EntitlementsRow, nowEpochSeconds: number): EntitlementClaims {
  const claims: EntitlementClaims = {
    sub: userId,
    iat: nowEpochSeconds,
    exp: nowEpochSeconds + TOKEN_TTL_SECONDS,
    jti: crypto.randomUUID(),
    ver: CLAIM_VERSION,
    ent: row.ent,
  };
  // lic_exp omitted entirely (not null) when there's no paid licence -- Free's ends_at is
  // meaningless, and the app's Kotlin DTO already treats a missing claim as null.
  if (row.licence_ends_at_epoch_ms !== null) {
    claims.lic_exp = Math.floor(row.licence_ends_at_epoch_ms / 1000);
  }
  return claims;
}

let cachedPrivateKey: CryptoKey | null = null;
let cachedPrivateKeyPem: string | null = null;

/** Imports (and module-level caches) the ES256 private key from its base64-encoded, one-line
 *  PKCS8 PEM env value -- decoded once per cold start, not per request. */
async function getPrivateKey(pkcs8Base64: string): Promise<CryptoKey> {
  if (cachedPrivateKey && cachedPrivateKeyPem === pkcs8Base64) return cachedPrivateKey;
  const pem = atob(pkcs8Base64);
  cachedPrivateKey = await importPKCS8(pem, "ES256");
  cachedPrivateKeyPem = pkcs8Base64;
  return cachedPrivateKey;
}

/** Signs an entitlement token. `jose`'s SignJWT produces a standards-compliant JWS (raw R||S
 *  signature per RFC 7518, base64url, no padding) -- exactly what the app's from-scratch Kotlin
 *  verifier (EntitlementTokenVerifier) expects; no custom encoding needed on either side. */
export async function signEntitlementToken(
  claims: EntitlementClaims,
  kid: string,
  pkcs8Base64: string,
): Promise<string> {
  const privateKey = await getPrivateKey(pkcs8Base64);
  return await new SignJWT(claims as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "ES256", kid })
    .sign(privateKey);
}

/** Signs a sunset declaration -- same key/kid/verifier, deliberately simpler claims, no `exp`. */
export async function signSunsetDeclaration(kid: string, pkcs8Base64: string, nowEpochSeconds: number): Promise<string> {
  const privateKey = await getPrivateKey(pkcs8Base64);
  return await new SignJWT({ sunset: true, iat: nowEpochSeconds })
    .setProtectedHeader({ alg: "ES256", kid })
    .sign(privateKey);
}
