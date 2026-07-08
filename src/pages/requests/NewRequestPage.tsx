import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../auth/AuthContext";
import TurnstileWidget, { turnstileConfigured } from "../../components/TurnstileWidget";
import type { TurnstileInstance } from "@marsidev/react-turnstile";

const FREQUENCIES = [
  "Every session", "Most sessions", "Occasionally", "Rarely, but it matters when I need it",
];

export default function NewRequestPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [whereInApp, setWhereInApp] = useState("");
  const [howItWorks, setHowItWorks] = useState("");
  const [frequency, setFrequency] = useState("");
  const [extra, setExtra] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (goal.trim().length < 30 || howItWorks.trim().length < 30) {
      setError("Please give us a little more detail in the starred boxes — a sentence or two is plenty.");
      return;
    }
    setBusy(true);
    const { data, error: insErr } = await supabase
      .from("enhancement_requests")
      .insert({
        author_id: session!.user.id,
        title: title.trim(),
        goal: goal.trim(),
        where_in_app: whereInApp.trim(),
        how_it_works: howItWorks.trim(),
        usage_frequency: frequency,
        extra_notes: extra.trim(),
      })
      .select("id")
      .single();
    if (insErr || !data) { setError(insErr?.message ?? "Something went wrong"); setBusy(false); return; }

    // Kick off the AI triage (fire-and-forget — the report lands later).
    supabase.functions.invoke("dispatch", {
      body: { action: "triage-report", request_id: data.id, turnstileToken: captchaToken },
    }).catch(() => {});

    navigate(`/requests/${data.id}`, { replace: true });
  }

  const field = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm";
  const label = "block text-sm font-medium text-gray-700 mt-4";

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm p-8">
      <h1 className="text-xl font-bold text-brand">Suggest an enhancement</h1>
      <p className="mt-2 text-sm text-gray-600">
        Tell us what would make Actors Lines better for you. No technical knowledge
        needed — describe it the way you'd describe it to another actor. Our system
        reviews every suggestion and the strongest go to a community vote.{" "}
        <Link to="/requests" className="text-brand hover:underline">See your previous requests</Link>.
      </p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <form onSubmit={submit}>
        <label className={label}>A short title for your idea *</label>
        <input required minLength={5} maxLength={80} value={title}
          onChange={(e) => setTitle(e.target.value)} className={field}
          placeholder="e.g. Slow down the other characters' voices" />

        <label className={label}>What are you trying to achieve? *</label>
        <p className="text-xs text-gray-500 mb-1">The problem or wish — not the solution. What's getting in your way today?</p>
        <textarea required rows={3} value={goal}
          onChange={(e) => setGoal(e.target.value)} className={field}
          placeholder="e.g. When I'm first learning a scene the cue lines come too fast for me to think…" />

        <label className={label}>Where in the app would this fit? *</label>
        <p className="text-xs text-gray-500 mb-1">Name the screen or moment — Practice, Rehearse, the scene list, importing…</p>
        <input required minLength={10} value={whereInApp}
          onChange={(e) => setWhereInApp(e.target.value)} className={field}
          placeholder="e.g. Rehearse mode, while the other characters are speaking" />

        <label className={label}>How might it work? *</label>
        <p className="text-xs text-gray-500 mb-1">Your best guess is fine — a slider? a button? something automatic?</p>
        <textarea required rows={3} value={howItWorks}
          onChange={(e) => setHowItWorks(e.target.value)} className={field}
          placeholder="e.g. A speed control on the run screen, like audiobook apps have…" />

        <label className={label}>How often would you use it?</label>
        <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className={field}>
          <option value="">Choose…</option>
          {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>

        <label className={label}>Anything else?</label>
        <textarea rows={2} value={extra}
          onChange={(e) => setExtra(e.target.value)} className={field}
          placeholder="Optional — examples from other apps, edge cases, anything." />

        <TurnstileWidget ref={turnstileRef} onToken={setCaptchaToken} />
        <button disabled={busy || (turnstileConfigured && !captchaToken)}
          className="mt-6 w-full rounded-md bg-brand text-white py-2 font-semibold hover:bg-brand-light disabled:opacity-50">
          {busy ? "Submitting…" : "Submit suggestion"}
        </button>
      </form>
    </div>
  );
}
