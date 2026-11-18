import { useState } from "react";
import { supabase } from "../lib/supabase";
import { verifyMfaCode, mfaRetryMessage } from "../auth/mfaVerify";
import { isNightTheme } from "../lib/theme";
import Button from "./ui/Button";
import Callout from "./ui/Callout";
import { Field, Input } from "./ui/Field";

/**
 * Asks for the 6-digit authenticator code and lifts the current session to AAL2 through the throttled
 * mfa-verify edge function (same path as LoginPage and ProfilePage enrolment). Used before the reset-password
 * form (DEF94) and before account deletion (DEF149). There is no recovery-code path: a member without their
 * authenticator is handled by an admin MFA reset, as at sign-in.
 */
export default function MfaStepUp({ intro, onDone }: { intro: string; onDone: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totp = factors?.totp?.find((f) => f.status === "verified");
    if (!totp) { setError("No authenticator found on this account."); setBusy(false); return; }
    const result = await verifyMfaCode(totp.id, code.trim());
    if (!result.ok) { setError(mfaRetryMessage(result)); setBusy(false); return; }
    const { error: sessionErr } = await supabase.auth.setSession(result.session);
    if (sessionErr) { setError("Could not complete verification. Please try again."); setBusy(false); return; }
    setBusy(false);
    onDone();
  }

  if (isNightTheme()) {
    return (
      <form onSubmit={submit} className="al-auth__form">
        {error && <Callout tone="error" className="al-auth__error">{error}</Callout>}
        <p className="al-auth__text">{intro}</p>
        <Field label="Authenticator code" id="otp" required>
          {(control) => (
            <Input {...control} inputMode="numeric" name="otp" autoComplete="one-time-code" autoFocus required
              placeholder="123456" value={code} className="al-auth__otp"
              onChange={(e) => setCode(e.target.value)} />
          )}
        </Field>
        <Button type="submit" block busy={busy} className="al-auth__submit" disabled={busy}>
          {busy ? "Checking…" : "Verify"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-sm text-gray-600">{intro}</p>
      <input inputMode="numeric" name="otp" id="otp" autoComplete="one-time-code" autoFocus required placeholder="123456"
        value={code} onChange={(e) => setCode(e.target.value)}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm tracking-widest text-center" />
      <button disabled={busy}
        className="w-full rounded-md bg-brand text-white py-2 font-semibold hover:bg-brand-light disabled:opacity-50">
        {busy ? "Checking…" : "Verify"}
      </button>
    </form>
  );
}
