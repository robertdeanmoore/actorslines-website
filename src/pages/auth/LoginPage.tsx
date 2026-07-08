import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../auth/AuthContext";
import TurnstileWidget, { turnstileConfigured } from "../../components/TurnstileWidget";
import type { TurnstileInstance } from "@marsidev/react-turnstile";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [stage, setStage] = useState<"credentials" | "mfa">("credentials");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshProfile } = useAuth();
  const dest = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/kb";

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({
      email, password,
      options: { captchaToken: captchaToken ?? undefined },
    });
    if (error) {
      setError(error.message); setBusy(false);
      turnstileRef.current?.reset(); setCaptchaToken(null);
      return;
    }
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      setStage("mfa");
      setBusy(false);
    } else {
      await refreshProfile();
      navigate(dest, { replace: true });
    }
  }

  async function submitMfa(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totp = factors?.totp?.[0];
    if (!totp) { setError("No authenticator found on this account."); setBusy(false); return; }
    const { data: challenge, error: cErr } =
      await supabase.auth.mfa.challenge({ factorId: totp.id });
    if (cErr || !challenge) { setError(cErr?.message ?? "Challenge failed"); setBusy(false); return; }
    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId: totp.id, challengeId: challenge.id, code: mfaCode.trim(),
    });
    if (vErr) { setError("That code wasn't right — try again."); setBusy(false); return; }
    await refreshProfile();
    navigate(dest, { replace: true });
  }

  return (
    <div className="max-w-sm mx-auto bg-white rounded-xl shadow-sm p-8">
      <h1 className="text-xl font-bold text-brand">Sign in</h1>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {stage === "credentials" ? (
        <form onSubmit={submitCredentials} className="mt-4 space-y-4">
          <input type="email" required placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input type="password" required placeholder="Password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <TurnstileWidget ref={turnstileRef} onToken={setCaptchaToken} />
          <button disabled={busy || (turnstileConfigured && !captchaToken)}
            className="w-full rounded-md bg-brand text-white py-2 font-semibold hover:bg-brand-light disabled:opacity-50">
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <div className="text-sm text-gray-500 flex justify-between">
            <Link to="/reset-password" className="hover:text-brand">Forgotten password?</Link>
            <Link to="/register" className="hover:text-brand">Create account</Link>
          </div>
        </form>
      ) : (
        <form onSubmit={submitMfa} className="mt-4 space-y-4">
          <p className="text-sm text-gray-600">
            Enter the 6-digit code from your authenticator app.
          </p>
          <input inputMode="numeric" autoFocus required placeholder="123456" value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm tracking-widest text-center" />
          <button disabled={busy}
            className="w-full rounded-md bg-brand text-white py-2 font-semibold hover:bg-brand-light disabled:opacity-50">
            {busy ? "Checking…" : "Verify"}
          </button>
        </form>
      )}
    </div>
  );
}
