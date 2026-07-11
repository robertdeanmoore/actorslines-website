import { useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import TurnstileWidget, { turnstileConfigured } from "../../components/TurnstileWidget";
import type { TurnstileInstance } from "@marsidev/react-turnstile";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
      captchaToken: captchaToken ?? undefined,
    });
    if (error) {
      setError(error.message);
      turnstileRef.current?.reset(); setCaptchaToken(null);
    } else setSent(true);
  }

  return (
    <div className="max-w-sm mx-auto bg-white rounded-xl shadow-sm p-8">
      <h1 className="text-xl font-bold text-brand">Reset your password</h1>
      {sent ? (
        <p className="mt-3 text-sm text-gray-600">
          If an account exists for <strong>{email}</strong>, a reset link is on its
          way. Follow it to choose a new password.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <input type="email" name="email" id="email" autoComplete="email" required placeholder="Your account email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <TurnstileWidget ref={turnstileRef} onToken={setCaptchaToken} />
          <button disabled={turnstileConfigured && !captchaToken}
            className="w-full rounded-md bg-brand text-white py-2 font-semibold hover:bg-brand-light disabled:opacity-50">
            Send reset link
          </button>
        </form>
      )}
    </div>
  );
}
