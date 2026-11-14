import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import TurnstileWidget, { turnstileConfigured } from "../../components/TurnstileWidget";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { isNightTheme } from "../../lib/theme";
import { Container } from "../../components/ui/Layout";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Callout from "../../components/ui/Callout";
import { Field, Input } from "../../components/ui/Field";

// Open self-serve registration is closed — accounts are invite-only for now (see
// AdminInvitesPage / the `invite` edge function). Flip to true (and redeploy) if
// self-serve sign-up is ever reopened.
const REGISTRATION_ENABLED = false;

export default function RegisterPage() {
  if (!REGISTRATION_ENABLED) {
    if (isNightTheme()) {
      return (
        <div className="al-auth">
          <Container size="form">
            <Card as="div" tone="dense" className="al-auth__card--center">
              <h1 className="al-auth__title">Invite only</h1>
              <p className="al-auth__text">
                Actors Lines is currently invite-only. If you've received an invite email,
                use the link in it to create your account.
              </p>
              <Link to="/" className="al-auth__link al-auth__action">Back to home</Link>
            </Card>
          </Container>
        </div>
      );
    }
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

  if (isNightTheme()) {
    // Night look (slice 5a): same fields, names, autoComplete, validation, handlers and Turnstile gating as the default look.
    if (done) {
      return (
        <div className="al-auth">
          <Container size="form">
            <Card as="div" tone="dense" className="al-auth__card--center">
              <h1 className="al-auth__title">Check your email</h1>
              <p className="al-auth__text">
                We've sent a confirmation link to <strong>{email}</strong>. Click it, then
                sign in. (Check your spam folder if it doesn't arrive within a minute.)
              </p>
              <Link to="/login" className="al-auth__link al-auth__action">Go to sign in</Link>
            </Card>
          </Container>
        </div>
      );
    }
    return (
      <div className="al-auth">
        <Container size="form">
          <Card as="div" tone="dense">
            <h1 className="al-auth__title">Create your account</h1>
            <p className="al-auth__text">
              Free, for actors. You'll get the knowledge base and a voice in what we build
              next. See our <Link to="/privacy">privacy policy</Link>.
            </p>
            {error && <Callout tone="error" className="al-auth__error">{error}</Callout>}
            <form onSubmit={submit} className="al-auth__form">
              <Field label="Display name" id="name" help="Shown on comments." required>
                {(control) => (
                  <Input {...control} name="name" autoComplete="name" required maxLength={40}
                    value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                )}
              </Field>
              <Field label="Email" id="email" required>
                {(control) => (
                  <Input {...control} type="email" name="email" autoComplete="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)} />
                )}
              </Field>
              <Field label="Password" id="new-password" help="8 characters or more." required>
                {(control) => (
                  <Input {...control} type="password" name="new-password" autoComplete="new-password" required minLength={8}
                    value={password} onChange={(e) => setPassword(e.target.value)} />
                )}
              </Field>
              <TurnstileWidget ref={turnstileRef} onToken={setCaptchaToken} theme="dark" className="al-auth__captcha" />
              <p className="al-auth__text">
                By creating an account you confirm you are 18 or over. See our{" "}
                <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.
              </p>
              <Button type="submit" block busy={busy} className="al-auth__submit"
                disabledReason={turnstileConfigured && !captchaToken ? "Complete the security check to continue." : undefined}
                disabled={busy || (turnstileConfigured && !captchaToken)}>
                {busy ? "Creating…" : "Create account"}
              </Button>
            </form>
            <p className="al-auth__fine">
              After signing in, we recommend enabling two-factor authentication from your
              profile page.
            </p>
          </Card>
        </Container>
      </div>
    );
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
        <input name="name" id="name" autoComplete="name" required maxLength={40} placeholder="Display name (shown on comments)"
          value={displayName} onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <input type="email" name="email" id="email" autoComplete="email" required placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <input type="password" name="new-password" id="new-password" autoComplete="new-password" required minLength={8} placeholder="Password (8+ characters)"
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
