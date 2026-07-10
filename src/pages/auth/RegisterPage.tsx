import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import TurnstileWidget, { turnstileConfigured } from "../../components/TurnstileWidget";
import type { TurnstileInstance } from "@marsidev/react-turnstile";

// Open self-serve registration is closed — accounts are invite-only for now (see
// AdminInvitesPage / the `invite` edge function). Flip to true (and redeploy) if
// self-serve sign-up is ever reopened.
const REGISTRATION_ENABLED = false;

export default function RegisterPage() {
  if (!REGISTRATION_ENABLED) {
    return (
      <div className="max-w-sm mx-auto bg-white rounded-xl shadow-sm p-8 text-center">
        <h1 className="text-xl font-bold text-brand">Invite only</h1>
        <p className="mt-3 text-sm text-gray-600">
          Actors Lines is currently invite-only. If you've received an invite email,
          use the link in it to create your account.
        </p>
        <Link to="/" className="mt-4 inline-block text-sm text-brand hover:underline">
          Back to home
        </Link>
      </div>
    );
  }
  return <RegisterForm />;
}

function RegisterForm() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { display_name: displayName.trim() },
        emailRedirectTo: `${window.location.origin}/login`,
        captchaToken: captchaToken ?? undefined,
      },
    });
    if (error) {
      setError(error.message); setBusy(false);
      turnstileRef.current?.reset(); setCaptchaToken(null);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="max-w-sm mx-auto bg-white rounded-xl shadow-sm p-8 text-center">
        <h1 className="text-xl font-bold text-brand">Check your email</h1>
        <p className="mt-3 text-sm text-gray-600">
          We've sent a confirmation link to <strong>{email}</strong>. Click it, then
          sign in. (Check your spam folder if it doesn't arrive within a minute.)
        </p>
        <Link to="/login" className="mt-4 inline-block text-sm text-brand hover:underline">
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto bg-white rounded-xl shadow-sm p-8">
      <h1 className="text-xl font-bold text-brand">Create your account</h1>
      <p className="mt-2 text-sm text-gray-500">
        Free, for actors. You'll get the knowledge base and a voice in what we build
        next. See our <Link to="/privacy" className="text-brand hover:underline">privacy policy</Link>.
      </p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <form onSubmit={submit} className="mt-4 space-y-4">
        <input required maxLength={40} placeholder="Display name (shown on comments)"
          value={displayName} onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <input type="email" required placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <input type="password" required minLength={8} placeholder="Password (8+ characters)"
          value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <TurnstileWidget ref={turnstileRef} onToken={setCaptchaToken} />
        <button disabled={busy || (turnstileConfigured && !captchaToken)}
          className="w-full rounded-md bg-brand text-white py-2 font-semibold hover:bg-brand-light disabled:opacity-50">
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-xs text-gray-500">
        After signing in, we recommend enabling two-factor authentication from your
        profile page.
      </p>
    </div>
  );
}
