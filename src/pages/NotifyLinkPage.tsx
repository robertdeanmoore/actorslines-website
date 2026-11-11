import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

/** Landing page for the confirm / unsubscribe links in the iPhone notify-list emails. */
export default function NotifyLinkPage() {
  const { action, token } = useParams();
  const [state, setState] = useState<"working" | "ok" | "error">("working");
  const valid = action === "confirm" || action === "unsubscribe";

  useEffect(() => {
    if (!valid) return;
    let cancelled = false;
    supabase.functions
      .invoke("notify-list", { body: { action, token } })
      .then(({ error }) => { if (!cancelled) setState(error ? "error" : "ok"); });
    return () => { cancelled = true; };
  }, [action, token, valid]);

  const message = !valid || state === "error"
    ? "This link is not valid any more."
    : state === "working"
      ? "One moment…"
      : action === "confirm"
        ? "Thanks, you are confirmed. We will email you once if an iPhone version becomes available."
        : "You are unsubscribed. We will not email you about iPhone again.";

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-sm p-8 text-center">
      <h1 className="text-xl font-bold text-brand">iPhone updates</h1>
      <p className="mt-4 text-gray-600" role="status">{message}</p>
      <Link to="/" className="mt-6 inline-block text-brand hover:underline">Back to Actors Lines</Link>
    </div>
  );
}
