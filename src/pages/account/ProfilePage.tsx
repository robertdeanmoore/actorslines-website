import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../auth/AuthContext";
import { verifyMfaCode, mfaRetryMessage } from "../../auth/mfaVerify";
import LicencePanel from "./LicencePanel";
import { isNightTheme } from "../../lib/theme";
import { Container } from "../../components/ui/Layout";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Callout from "../../components/ui/Callout";
import { ConfirmDialog } from "../../components/ui/Modal";
import { Field, Input } from "../../components/ui/Field";

export default function ProfilePage() {
  const { session, profile, refreshProfile, signOut } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [message, setMessage] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enrolQr, setEnrolQr] = useState<string | null>(null);
  const [enrolFactorId, setEnrolFactorId] = useState<string | null>(null);
  const [enrolCode, setEnrolCode] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const deleting = useRef(false);

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      setFactorId(data?.totp?.find((f) => f.status === "verified")?.id ?? null);
    });
  }, []);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase
      .from("profiles").update({ display_name: displayName.trim() })
      .eq("id", session!.user.id);
    setMessage(error ? error.message : "Saved.");
    if (!error) await refreshProfile();
  }

  async function startEnrol() {
    setMessage("");
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    if (error || !data) { setMessage(error?.message ?? "Could not start enrolment"); return; }
    setEnrolQr(data.totp.qr_code);
    setEnrolFactorId(data.id);
  }

  // Challenge/verify happen server-side via the mfa-verify edge function --
  // same throttled path LoginPage's step-up uses (RobLife WIP #103 Row 4,
  // Holly's §5.1 finding). This session is already signed in, so the
  // returned session is only ever the same identity's own elevated (aal2)
  // tokens -- adopting it via setSession() is what actually raises this
  // browser's own session to aal2, the same way the login flow's step-up
  // does.
  async function confirmEnrol(e: React.FormEvent) {
    e.preventDefault();
    if (!enrolFactorId) return;
    const result = await verifyMfaCode(enrolFactorId, enrolCode.trim());
    if (!result.ok) { setMessage(mfaRetryMessage(result)); return; }
    const { error: sessionErr } = await supabase.auth.setSession(result.session);
    if (sessionErr) { setMessage("Could not complete verification. Please try again."); return; }
    setFactorId(enrolFactorId);
    setEnrolQr(null); setEnrolFactorId(null); setEnrolCode("");
    setMessage("Two-factor authentication is now on.");
  }

  async function disable2fa() {
    if (!factorId) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) setMessage(error.message);
    else { setFactorId(null); setMessage("Two-factor authentication turned off."); }
  }

  async function deleteAccount() {
    if (deleting.current) return;
    deleting.current = true;
    setDeleteError("");
    const { error } = await supabase.rpc("delete_own_account");
    if (error) {
      setMessage(error.message);
      setDeleteError(error.message);
      deleting.current = false;
      return;
    }
    await signOut();
  }

  if (isNightTheme()) {
    // Night look (slice 5b): same handlers, calls, 2FA flow and delete-account RPC as the default look.
    // Delete confirm is a dialog (design spec: destructive action = destructive button + confirm dialog).
    return (
      <Container size="formWide" className="al-members">
        <div className="space-y-6">
          <Card as="div" tone="dense">
            <h1 className="al-page-title">Your profile</h1>
            <p className="al-page-intro">{session?.user.email}</p>
            {message && <Callout tone="note" className="mt-4">{message}</Callout>}
            <form onSubmit={saveName} className="mt-4">
              <Field label="Display name">
                {(control) => (
                  <Input {...control} maxLength={40} value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)} />
                )}
              </Field>
              <Button type="submit" className="mt-4">Save</Button>
            </form>
          </Card>

          <LicencePanel />

          <Card as="section" tone="dense" title="Two-factor authentication" headingLevel={2}>
            {factorId ? (
              <div className="mt-3">
                <p>✅ On — you'll be asked for a code from your authenticator app at sign-in.</p>
                <Button variant="secondary" onClick={disable2fa} className="mt-4">Turn off 2FA</Button>
              </div>
            ) : enrolQr ? (
              <form onSubmit={confirmEnrol} className="mt-3">
                <p>
                  1. Scan this QR code with an authenticator app (Google Authenticator,
                  Microsoft Authenticator, Authy…).<br />2. Enter the 6-digit code it shows.
                </p>
                <img src={enrolQr} alt="2FA enrolment QR code" className="my-4 w-40 h-40 rounded-md bg-white p-2" />
                <Field label="Authenticator code" required>
                  {(control) => (
                    <Input {...control} inputMode="numeric" required placeholder="123456" value={enrolCode}
                      onChange={(e) => setEnrolCode(e.target.value)} />
                  )}
                </Field>
                <Button type="submit" className="mt-4">Confirm</Button>
              </form>
            ) : (
              <div className="mt-3">
                <p>Off. We strongly recommend turning it on — it protects your account even
                  if your password leaks.</p>
                <Button onClick={startEnrol} className="mt-4">Set up 2FA</Button>
              </div>
            )}
          </Card>

          <Card as="section" tone="dense" title="Delete account" headingLevel={2}>
            <p className="mt-2">
              Permanently deletes your account and its data, including your requests, comments, votes
              and Learn Lines scripts. If you bought a licence, we keep only a minimal order record, as
              the law requires.
            </p>
            {deleteError && <Callout tone="error" className="mt-4">{deleteError}</Callout>}
            <Button variant="secondary" onClick={() => setConfirmDelete(true)} className="mt-4">
              Delete my account…
            </Button>
            <ConfirmDialog
              open={confirmDelete}
              onClose={() => setConfirmDelete(false)}
              onConfirm={() => { setConfirmDelete(false); void deleteAccount(); }}
              title="Delete account"
              description="Permanently deletes your account and its data, including your requests, comments, votes and Learn Lines scripts. If you bought a licence we keep only a minimal order record, as the law requires. This cannot be undone."
              confirmLabel="Yes, delete my account"
              destructive
            />
          </Card>
        </div>
      </Container>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h1 className="text-xl font-bold text-brand">Your profile</h1>
        <p className="mt-1 text-sm text-gray-500">{session?.user.email}</p>
        {message && <p className="mt-3 text-sm text-brand">{message}</p>}
        <form onSubmit={saveName} className="mt-4 flex gap-2">
          <input maxLength={40} value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="Display name" />
          <button className="rounded-md bg-brand text-white px-4 text-sm font-semibold hover:bg-brand-light">
            Save
          </button>
        </form>
      </div>

      <LicencePanel />

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-semibold text-brand">Two-factor authentication</h2>
        {factorId ? (
          <div className="mt-3 text-sm text-gray-600">
            <p>✅ On — you'll be asked for a code from your authenticator app at sign-in.</p>
            <button onClick={disable2fa} className="mt-3 text-red-600 hover:underline">
              Turn off 2FA
            </button>
          </div>
        ) : enrolQr ? (
          <form onSubmit={confirmEnrol} className="mt-3 space-y-3 text-sm">
            <p className="text-gray-600">
              1. Scan this QR code with an authenticator app (Google Authenticator,
              Microsoft Authenticator, Authy…).<br />2. Enter the 6-digit code it shows.
            </p>
            <img src={enrolQr} alt="2FA enrolment QR code" className="w-40 h-40" />
            <div className="flex gap-2">
              <input inputMode="numeric" required placeholder="123456" value={enrolCode}
                onChange={(e) => setEnrolCode(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm tracking-widest" />
              <button className="rounded-md bg-brand text-white px-4 text-sm font-semibold hover:bg-brand-light">
                Confirm
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-3 text-sm text-gray-600">
            <p>Off. We strongly recommend turning it on — it protects your account even
              if your password leaks.</p>
            <button onClick={startEnrol}
              className="mt-3 rounded-md bg-brand text-white px-4 py-2 text-sm font-semibold hover:bg-brand-light">
              Set up 2FA
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-semibold text-red-700">Delete account</h2>
        <p className="mt-2 text-sm text-gray-600">
          Permanently removes your account, requests, comments and votes. This cannot
          be undone.
        </p>
        {confirmDelete ? (
          <div className="mt-3 flex gap-3">
            <button onClick={deleteAccount}
              className="rounded-md bg-red-600 text-white px-4 py-2 text-sm font-semibold hover:bg-red-700">
              Yes, delete everything
            </button>
            <button onClick={() => setConfirmDelete(false)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100">
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)}
            className="mt-3 text-sm text-red-600 hover:underline">
            Delete my account…
          </button>
        )}
      </div>
    </div>
  );
}
