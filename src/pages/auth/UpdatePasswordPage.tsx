import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { isNightTheme } from "../../lib/theme";
import { Container } from "../../components/ui/Layout";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Callout from "../../components/ui/Callout";
import { Field, Input } from "../../components/ui/Field";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); setBusy(false); return; }
    navigate("/kb", { replace: true });
  }

  if (isNightTheme()) {
    // Night look (slice 5a): same field, name, autoComplete, validation and handler as the default look.
    return (
      <div className="al-auth">
        <Container size="form">
          <Card as="div" tone="dense">
            <h1 className="al-auth__title">Choose a new password</h1>
            <form onSubmit={submit} className="al-auth__form">
              {error && <Callout tone="error" className="al-auth__error">{error}</Callout>}
              <Field label="New password" id="new-password" help="8 characters or more." required>
                {(control) => (
                  <Input {...control} type="password" name="new-password" autoComplete="new-password" required minLength={8}
                    value={password} onChange={(e) => setPassword(e.target.value)} />
                )}
              </Field>
              <Button type="submit" block busy={busy} className="al-auth__submit" disabled={busy}>
                {busy ? "Saving…" : "Save password"}
              </Button>
            </form>
          </Card>
        </Container>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto bg-white rounded-xl shadow-sm p-8">
      <h1 className="text-xl font-bold text-brand">Choose a new password</h1>
      <form onSubmit={submit} className="mt-4 space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <input type="password" name="new-password" id="new-password" autoComplete="new-password" required minLength={8} placeholder="New password (8+ characters)"
          value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <button disabled={busy}
          className="w-full rounded-md bg-brand text-white py-2 font-semibold hover:bg-brand-light disabled:opacity-50">
          {busy ? "Saving…" : "Save password"}
        </button>
      </form>
    </div>
  );
}
