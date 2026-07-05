import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    if (error) setError(error.message);
    else setSent(true);
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
          <input type="email" required placeholder="Your account email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <button className="w-full rounded-md bg-brand text-white py-2 font-semibold hover:bg-brand-light">
            Send reset link
          </button>
        </form>
      )}
    </div>
  );
}
