import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../auth/AuthContext";
import LicencePanel from "./LicencePanel";

export default function ProfilePage() {
  const { session, profile, refreshProfile, signOut } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [message, setMessage] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enrolQr, setEnrolQr] = useState<string | null>(null);
  const [enrolFactorId, setEnrolFactorId] = useState<string | null>(null);
  const [enrolCode, setEnrolCode] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  async function confirmEnrol(e: React.FormEvent) {
    e.preventDefault();
    if (!enrolFactorId) return;
    const { data: challenge, error: cErr } =
      await supabase.auth.mfa.challenge({ factorId: enrolFactorId });
    if (cErr || !challenge) { setMessage(cErr?.message ?? "Challenge failed"); return; }
    const { error } = await supabase.auth.mfa.verify({
      factorId: enrolFactorId, challengeId: challenge.id, code: enrolCode.trim(),
    });
    if (error) { setMessage("That code wasn't right — try again."); return; }
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
    const { error } = await supabase.rpc("delete_own_account");
    if (error) { setMessage(error.message); return; }
    await signOut();
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
