import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { isNightTheme } from "../lib/theme";
import { Container } from "../components/ui/Layout";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

type State = "idle" | "working" | "ok" | "invalid" | "failed";

/**
 * Landing page for the confirm / unsubscribe links in the iPhone notify-list emails.
 * The action is sent only when the visitor clicks the button, never on page load, so an
 * email link scanner that opens the link cannot confirm or unsubscribe anyone.
 */
export default function NotifyLinkPage() {
  const { action, token } = useParams();
  const [state, setState] = useState<State>("idle");
  const valid = action === "confirm" || action === "unsubscribe";

  async function submit() {
    setState("working");
    const { error } = await supabase.functions.invoke("notify-list", { body: { action, token } });
    if (!error) { setState("ok"); return; }
    const status = (error as { context?: Response }).context?.status;
    setState(status === 400 || status === 404 ? "invalid" : "failed");
  }

  const message = !valid || state === "invalid"
    ? "This link is not valid any more, or has already been used. If you were unsubscribing, your address may already be deleted. If you are unsure, email hello@actorslines.app."
    : state === "failed"
      ? "Something went wrong. Please try again later."
      : state === "working"
        ? "One moment…"
        : state === "ok"
          ? action === "confirm"
            ? "Thanks, you are confirmed. We will email you once if an iPhone version becomes available. You can unsubscribe at any time using the link in our emails. We keep your address for no more than 12 months from sign-up."
            : "You are unsubscribed and your address has been deleted. We will not email you about iPhone again."
          : action === "confirm"
            ? "Please confirm that you want to be told if an iPhone version of Actors Lines becomes available."
            : "Please confirm that you want to unsubscribe and have your address deleted.";

  const showButton = valid && (state === "idle" || state === "failed");

  if (isNightTheme()) {
    // Night look (slice 5a): same message, button, click-to-act behaviour and links as the default look.
    return (
      <div className="al-auth">
        <Container size="form">
          <Card as="div" tone="dense" className="al-auth__card--center">
            <h1 className="al-auth__title">iPhone updates</h1>
            <p id="notify-link-message" className="al-auth__text" role="status">{message}</p>
            {showButton && (
              <Button type="button" onClick={submit} className="al-auth__action">
                {action === "confirm" ? "Confirm my email" : "Unsubscribe"}
              </Button>
            )}
            <div className="al-auth__action">
              <Link to="/" className="al-auth__link">Back to Actors Lines</Link>
            </div>
          </Card>
        </Container>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-sm p-8 text-center">
      <h1 className="text-xl font-bold text-brand">iPhone updates</h1>
      <p id="notify-link-message" className="mt-4 text-gray-600" role="status">{message}</p>
      {showButton && (
        <button
          type="button"
          onClick={submit}
          aria-describedby="notify-link-message"
          className="mt-4 bg-brand text-white rounded-lg px-4 py-2 hover:opacity-90"
        >
          {action === "confirm" ? "Confirm my email" : "Unsubscribe"}
        </button>
      )}
      <Link to="/" className="mt-6 block text-brand hover:underline">Back to Actors Lines</Link>
    </div>
  );
}
