// Bounded auth bootstrap. Every step that can wait on the network is raced against a
// timeout and every failure becomes a result, never a throw, so the UI can never sit on
// "Loading..." forever (delete-account page hang, 2026-11-25). A failed or timed-out load
// is an error state: it never grants access and never counts as "signed in".

import type { Profile } from "../lib/types";

export const AUTH_LOAD_TIMEOUT_MS = 12000;

export const AUTH_LOAD_ERROR =
  "We could not load your account. Check your connection and try again, or sign in again.";

export class AuthTimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} timed out after ${ms} ms`);
    this.name = "AuthTimeoutError";
  }
}

export function withTimeout<T>(work: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new AuthTimeoutError(label, ms)), ms);
    Promise.resolve(work).then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err: unknown) => { clearTimeout(timer); reject(err); },
    );
  });
}

export interface AuthLoadDeps {
  getAal: () => PromiseLike<{ currentLevel?: string | null; nextLevel?: string | null } | null | undefined>;
  checkTrusted: () => Promise<boolean>;
  fetchProfile: (userId: string) => PromiseLike<{ data: unknown; error: unknown }>;
}

export type AuthLoadResult =
  | { status: "signed-out" }
  | { status: "mfa" }
  | { status: "ok"; profile: Profile }
  | { status: "error"; message: string };

export async function loadAuthState(
  userId: string | null,
  deps: AuthLoadDeps,
  timeoutMs: number = AUTH_LOAD_TIMEOUT_MS,
): Promise<AuthLoadResult> {
  if (!userId) return { status: "signed-out" };
  try {
    return await withTimeout(
      (async (): Promise<AuthLoadResult> => {
        const aal = await deps.getAal();
        const mfaPending =
          aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2" && !(await deps.checkTrusted());
        if (mfaPending) return { status: "mfa" };
        const { data, error } = await deps.fetchProfile(userId);
        if (error || !data) return { status: "error", message: AUTH_LOAD_ERROR };
        return { status: "ok", profile: data as Profile };
      })(),
      timeoutMs,
      "Loading account",
    );
  } catch {
    return { status: "error", message: AUTH_LOAD_ERROR };
  }
}
