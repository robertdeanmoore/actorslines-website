import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "../lib/supabase";
import type { Profile } from "../lib/types";
import { checkTrusted, clearToken } from "./trustedDevice";
import {
  AUTH_LOAD_ERROR, AUTH_LOAD_TIMEOUT_MS, createLoadCoordinator, loadAuthState, requireAal, withTimeout,
} from "./authLoad";

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  /** aal1 while a 2FA-enrolled user still needs their code; aal2 once verified. */
  needsMfa: boolean;
  /** Set when the session or profile could not be loaded (failure or timeout). Never means signed in. */
  error: string | null;
  /** Re-run the bounded session and profile load after an error. */
  retry: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  session: null, profile: null, loading: true, needsMfa: false,
  error: null, retry: async () => {},
  refreshProfile: async () => {}, signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [needsMfa, setNeedsMfa] = useState(false);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  // One coordinator for the provider's life: dedupes same-session loads and orders writes.
  const loads = useRef(createLoadCoordinator()).current;

  // The first load for a session key is shared by the bootstrap and INITIAL_SESSION paths
  // (one profiles select, one touch_last_seen). `force` always starts a fresh load.
  function loadProfile(s: Session | null, force = false): Promise<void> {
    const key = s ? `${s.user.id}:${s.access_token}` : "signed-out";
    return loads.run(key, async (isCurrent) => {
      if (isCurrent()) setSession(s);
      const result = await loadAuthState(s?.user.id ?? null, {
        getAal: async () => requireAal(await supabase.auth.mfa.getAuthenticatorAssuranceLevel()),
        checkTrusted,
        fetchProfile: (id) => supabase.from("profiles").select("*").eq("id", id).single(),
      });
      if (!isCurrent()) return; // a newer load owns the state now
      setNeedsMfa(result.status === "mfa");
      setProfile(result.status === "ok" ? result.profile : null);
      setError(result.status === "error" ? result.message : null);
      setLoading(false);
      if (result.status === "ok") {
        // Best effort and off the critical path: a slow heartbeat must not hold the page.
        void Promise.resolve(supabase.rpc("touch_last_seen")).catch(() => {});
      }
    }, force);
  }

  async function bootstrap(force = false) {
    const startGen = loads.generation();
    try {
      const { data } = await withTimeout(supabase.auth.getSession(), AUTH_LOAD_TIMEOUT_MS, "Reading session");
      await loadProfile(data.session, force);
    } catch {
      if (loads.generation() === startGen) { // no newer load has taken over
        setError(AUTH_LOAD_ERROR);
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    if (!supabaseConfigured) return;
    void bootstrap();
    // Do not call supabase.auth.* inside this callback: supabase-js holds an internal lock
    // while it runs, so awaiting another auth call here can deadlock. Defer to a new task.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setTimeout(() => { void loadProfile(s); }, 0);
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session, profile, loading, needsMfa, error,
        retry: async () => { setError(null); setLoading(true); await bootstrap(true); },
        refreshProfile: () => loadProfile(session, true),
        signOut: async () => { clearToken(); await supabase.auth.signOut(); },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
