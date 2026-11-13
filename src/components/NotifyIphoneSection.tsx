import { useRef, useState } from "react";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { supabase, supabaseConfigured } from "../lib/supabase";
import TurnstileWidget, { turnstileConfigured } from "./TurnstileWidget";
import Button from "./ui/Button";
import Callout from "./ui/Callout";
import Card from "./ui/Card";
import { Checkbox, Field, Input } from "./ui/Field";
import { isNightTheme } from "../lib/theme";

// Must match CONSENT_TEXT in supabase/functions/notify-list/index.ts (stored as the consent record).
const CONSENT_LABEL =
  "Email me a confirmation link now, then one email if an iPhone version of Actors Lines becomes available. No other emails. Unsubscribe any time.";

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/;

// The normal Turnstile widget is 300px wide and overflows the night card on a 390px phone; the compact
// widget (150px) fits. Read once at mount: Turnstile cannot change size after it renders.
function narrowViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 30rem)").matches;
}

/** Front-page opt-in list for iPhone users. Honest copy: Android now, iPhone only being explored. */
export default function NotifyIphoneSection() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const [compactWidget] = useState(narrowViewport);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const value = email.trim();
    if (value.length < 6 || value.length > 254 || !EMAIL_RE.test(value)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!consent) {
      setError("Please tick the box to say you agree.");
      return;
    }
    setBusy(true);
    const { error: fnErr } = await supabase.functions.invoke("notify-list", {
      body: { action: "subscribe", email: value, consent, turnstileToken: captchaToken },
    });
    if (fnErr) {
      let msg = "Something went wrong. Please try again later.";
      const res = (fnErr as { context?: Response }).context;
      if (res && typeof res.json === "function") {
        const detail = await res.json().catch(() => null);
        if (detail?.error) msg = detail.error;
      }
      setError(msg);
      turnstileRef.current?.reset();
      setCaptchaToken(null);
      setBusy(false);
      return;
    }
    setDone(true);
    setBusy(false);
  }

  if (isNightTheme()) {
    // Night look (slice 3a): same copy, consent label, fields, handlers and Turnstile gating as below.
    return (
      <section aria-labelledby="iphone-heading">
        <Card as="div" tone="marketing">
          <h2 id="iphone-heading" className="al-card__title">On iPhone? Get notified</h2>
          <p className="al-panel-text al-notify__lead">
            Actors Lines is on Android now. An iPhone version is being explored: nothing is promised yet.
            Leave your email and we will tell you once if that changes.
          </p>
          {done ? (
            <Callout tone="success">
              Thanks. Check your inbox for an email to confirm your address. If it does not arrive,
              look in your spam folder.
            </Callout>
          ) : (
            <form onSubmit={submit} className="al-notify__form">
              <Field label="Email address" required>
                {(control) => (
                  <Input {...control} type="email" maxLength={254} autoComplete="email"
                    value={email} onChange={(e) => setEmail(e.target.value)} />
                )}
              </Field>
              <Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} label={CONSENT_LABEL} />
              <TurnstileWidget ref={turnstileRef} onToken={setCaptchaToken} theme="dark"
                size={compactWidget ? "compact" : "normal"} className="al-notify__captcha" />
              {error && <Callout tone="error">{error}</Callout>}
              <Button type="submit" block busy={busy} className="al-notify__submit"
                disabledReason={turnstileConfigured && !captchaToken ? "Complete the security check to continue." : undefined}
                disabled={!supabaseConfigured || (turnstileConfigured && !captchaToken)}>
                {busy ? "Sending…" : "Notify me"}
              </Button>
              <p className="al-field__help al-notify__legal">
                We use your email only for this, and send a confirmation link first. If you do not confirm, we delete it after 30 days. Otherwise we keep it for up to 12 months, then delete it. You can
                unsubscribe at any time, which deletes your address. See our <a href="/privacy">privacy policy</a>.
              </p>
            </form>
          )}
        </Card>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-xl shadow-sm p-8 max-w-2xl mx-auto w-full" aria-labelledby="iphone-heading">
      <h2 id="iphone-heading" className="text-2xl font-bold text-brand text-center">On iPhone? Get notified</h2>
      <p className="mt-3 text-gray-600 text-center">
        Actors Lines is on Android now. An iPhone version is being explored: nothing is promised yet.
        Leave your email and we will tell you once if that changes.
      </p>
      {done ? (
        <p className="mt-6 text-center text-sm text-green-700" role="status">
          Thanks. Check your inbox for an email to confirm your address. If it does not arrive,
          look in your spam folder.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-6">
          <label htmlFor="notify-email" className="block text-sm font-medium text-gray-700">Email address</label>
          <input id="notify-email" type="email" required maxLength={254} autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <label className="mt-3 flex items-start gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
            <span>{CONSENT_LABEL}</span>
          </label>
          <TurnstileWidget ref={turnstileRef} onToken={setCaptchaToken} />
          {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
          <button disabled={busy || !supabaseConfigured || (turnstileConfigured && !captchaToken)}
            className="mt-4 w-full rounded-md bg-brand text-white py-2 font-semibold hover:bg-brand-light disabled:opacity-50">
            {busy ? "Sending…" : "Notify me"}
          </button>
          <p className="mt-3 text-xs text-gray-500">
            We use your email only for this, and send a confirmation link first. If you do not confirm, we delete it after 30 days. Otherwise we keep it for up to 12 months, then delete it. You can
            unsubscribe at any time, which deletes your address. See our <a href="/privacy" className="underline">privacy policy</a>.
          </p>
        </form>
      )}
    </section>
  );
}
