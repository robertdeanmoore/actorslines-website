// "Trust this device for 30 days" — client-side counterpart to the trusted-device
// edge function. The device token lives only in this browser (localStorage); the
// server only ever sees/stores a hash of it (see supabase/functions/trusted-device).

import { supabase } from "../lib/supabase";

const STORAGE_KEY = "av_trusted_device";

export function getStoredToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function storeToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(STORAGE_KEY);
  cachedResult = null;
}

// Checking hits the network, and both AuthContext (on every session load) and
// LoginPage (at sign-in) need the answer — cache the result for the tab's lifetime
// so a page full of renders/effects doesn't spam the edge function.
let cachedResult: boolean | null = null;

export async function checkTrusted(): Promise<boolean> {
  if (cachedResult !== null) return cachedResult;
  const token = getStoredToken();
  if (!token) {
    cachedResult = false;
    return false;
  }
  const { data, error } = await supabase.functions.invoke("trusted-device", {
    body: { action: "check", token },
  });
  cachedResult = !error && data?.trusted === true;
  return cachedResult;
}

export async function issueTrustedDevice(): Promise<void> {
  const { data, error } = await supabase.functions.invoke("trusted-device", {
    body: { action: "issue" },
  });
  if (error || typeof data?.token !== "string") return;
  storeToken(data.token);
  cachedResult = true;
}
