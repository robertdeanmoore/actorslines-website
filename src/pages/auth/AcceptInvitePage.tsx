import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import TurnstileWidget, { turnstileConfigured } from "../../components/TurnstileWidget";
import type { TurnstileInstance } from "@marsidev/react-turnstile";

type CheckState = "checking" | "valid" | "invalid";

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [checkState, setCheckState] = useState<CheckState>("checking");
  const [invalidReason, setInvalidReason] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  useEffect(() => {
    if (!token) return;
    supabase.functions.invoke("invite", { body: { action: "check", token } }).then(({ data, error: err }) => {
      if (err || !data?.valid) {
        setCheckState("invalid");
        setInvalidReason(
          data?.reason === "used"
            ? "This invite link has already been used."
            : data?.reason === "expired"
              ? "This invite link has expired."
              : "This invite link isn't valid.",
        );
        return;
      }
      setEmail(data.email);
      setCheckState("valid");
    });
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { data, error: err } = await supabase.functions.invoke("invite", {
      body: {
        action: "accept",
        token,
        password,
        displayName: displayName.trim(),
        turnstileToken: captchaToken ?? undefined,
      },
    });
    if (err || !data?.ok) {
      setError(err?.message ?? "Something went wrong — please try again.");
      setBusy(false);
      turnstileRef.current?.reset();
      setCaptchaToken(null);
      return;
    }
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (signInErr) {
      navigate("/login", { replace: true });
      return;
    }
    navigate("/kb", { replace: true });
  }

  if (checkState === "checking") {
    return <p className="p-8 text-center text-gray-500">Checking your invite…</p>;
  }

  if (checkState === "invalid") {
    return (
      <div className="max-w-sm mx-auto bg-white rounded-xl shadow-sm p-8 text-center">
        <h1 className="text-xl font-bold text-brand">Invite link not valid</h1>
        <p className="mt-3 text-sm text-gray-600">{invalidReason}</p>
        <p className="mt-3 text-sm text-gray-600">
          Ask whoever invited you to send a new one.
        </p>
        <Link to="/" className="mt-4 inline-block text-sm text-brand hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto bg-white rounded-xl shadow-sm p-8">
      <h1 className="text-xl font-bold text-brand">You're invited</h1>
      <p className="mt-2 text-sm text-gray-500">
        Create your account for <strong>{email}</strong>. See our{" "}
        <Link to="/privacy" className="text-brand hover:underline">privacy policy</Link>.
      </p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <form onSubmit={submit} className="mt-4 space-y-4">
        <input
          required
          maxLength={40}
          placeholder="Display name (shown on comments)"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Choose a password (8+ characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <TurnstileWidget ref={turnstileRef} onToken={setCaptchaToken} />
        <button
          disabled={busy || (turnstileConfigured && !captchaToken)}
          className="w-full rounded-md bg-brand text-white py-2 font-semibold hover:bg-brand-light disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
    </div>
  );
}
