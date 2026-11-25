import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "../lib/supabase";
import type { Profile } from "../lib/types";
import { checkTrusted, clearToken } from "./trustedDevice";
import { AUTH_LOAD_ERROR, AUTH_LOAD_TIMEOUT_MS, loadAuthState, withTimeout } from "./authLoad";

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

  async function loadProfile(s: Session | null) {
    const result = await loadAuthState(s?.user.id ?? null, {
      getAal: async () => (await supabase.auth.mfa.getAuthenticatorAssuranceLevel()).data,
      checkTrusted,
      fetchProfile: (id) => supabase.from("profiles").select("*").eq("id", id).single(),
    });
    setNeedsMfa(result.status === "mfa");
    setProfile(result.status === "ok" ? result.profile : null);
    setError(result.status === "error" ? result.message : null);
    if (result.status === "ok") {
      // Best effort and off the critical path: a slow heartbeat must not hold the page.
      void Promise.resolve(supabase.rpc("touch_last_seen")).catch(() => {});
    }
  }

  async function bootstrap() {
    try {
      const { data } = await withTimeout(supabase.auth.getSession(), AUTH_LOAD_TIMEOUT_MS, "Reading session");
      setSession(data.session);
      await loadProfile(data.session);
    } catch {
      setError(AUTH_LOAD_ERROR);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!supabaseConfigured) return;
    void bootstrap();
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      await loadProfile(s);
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session, profile, loading, needsMfa, error,
        retry: async () => { setError(null); setLoading(true); await bootstrap(); },
        refreshProfile: () => loadProfile(session),
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
