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

export interface AalResponse {
  data: { currentLevel?: string | null; nextLevel?: string | null } | null;
  error: unknown;
}

/** Fail closed: an errored or empty AAL answer must never read as "no 2FA needed". */
export function requireAal(res: AalResponse): NonNullable<AalResponse["data"]> {
  if (res.error || !res.data) throw new Error("Could not read the authentication level");
  return res.data;
}

/**
 * Reads the live session from the auth client (bounded) and hands THAT to `load`. Callers
 * must never pass a session captured by a React render closure: right after a sign-in the
 * closure still holds the pre-login value, and a forced load with it would sign the UI out.
 * A failed or timed-out read rejects without calling `load` (fail closed).
 */
export async function loadWithLiveSession<S>(
  getSession: () => PromiseLike<{ data: { session: S | null } }>,
  load: (session: S | null) => Promise<void>,
  timeoutMs: number = AUTH_LOAD_TIMEOUT_MS,
): Promise<void> {
  const { data } = await withTimeout(getSession(), timeoutMs, "Reading session");
  await load(data.session);
}

export interface LoadCoordinator {
  /**
   * Runs `work` for `key`. A call with the same key as a load still in flight shares that
   * load (one network round of requests) unless `force`. `work` receives `isCurrent`, which
   * turns false once a newer load has started, so a stale load can skip its state writes.
   */
  run<T>(key: string, work: (isCurrent: () => boolean) => Promise<T>, force?: boolean): Promise<T>;
  /** Number of loads started so far; changes whenever a newer load starts. */
  generation(): number;
}

export function createLoadCoordinator(): LoadCoordinator {
  let gen = 0;
  let inflight: { key: string; promise: Promise<unknown> } | null = null;
  return {
    run<T>(key: string, work: (isCurrent: () => boolean) => Promise<T>, force = false): Promise<T> {
      if (!force && inflight && inflight.key === key) return inflight.promise as Promise<T>;
      const mine = ++gen;
      const promise: Promise<T> = work(() => gen === mine).finally(() => {
        if (inflight && inflight.promise === promise) inflight = null;
      });
      inflight = { key, promise };
      return promise;
    },
    generation: () => gen,
  };
}
