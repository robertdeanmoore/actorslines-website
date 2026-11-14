import { useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import TurnstileWidget, { turnstileConfigured, useNightWidgetSize } from "../../components/TurnstileWidget";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { isNightTheme } from "../../lib/theme";
import { Container } from "../../components/ui/Layout";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Callout from "../../components/ui/Callout";
import { Field, Input } from "../../components/ui/Field";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const widgetSize = useNightWidgetSize();

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

  if (isNightTheme()) {
    // Night look (slice 5a): same field, name, autoComplete, handler and Turnstile gating as the default look.
    return (
      <div className="al-auth">
        <Container size="form">
          <Card as="div" tone="dense">
            <h1 className="al-auth__title">Reset your password</h1>
            {sent ? (
              <p className="al-auth__text">
                If an account exists for <strong>{email}</strong>, a reset link is on its
                way. Follow it to choose a new password.
              </p>
            ) : (
              <form onSubmit={submit} className="al-auth__form">
                {error && <Callout tone="error" className="al-auth__error">{error}</Callout>}
                <Field label="Your account email" id="email" required>
                  {(control) => (
                    <Input {...control} type="email" name="email" autoComplete="email" required value={email}
                      onChange={(e) => setEmail(e.target.value)} />
                  )}
                </Field>
                <TurnstileWidget ref={turnstileRef} onToken={setCaptchaToken} theme="dark" size={widgetSize} className="al-auth__captcha" />
                <Button type="submit" block className="al-auth__submit"
                  disabledReason={turnstileConfigured && !captchaToken ? "Complete the security check to continue." : undefined}
                  disabled={turnstileConfigured && !captchaToken}>
                  Send reset link
                </Button>
              </form>
            )}
          </Card>
        </Container>
      </div>
    );
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
