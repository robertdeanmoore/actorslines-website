import { useEffect, useState } from "react";
import TurnstileWidget, { turnstileConfigured } from "../../components/TurnstileWidget";

declare global {
  interface Window {
    AndroidTurnstile?: {
      onToken: (token: string | null) => void;
    };
  }
}

/**
 * Chrome-free leaf page loaded inside the Android app's WebView during sign-in, never linked
 * from anywhere in the site itself. Turnstile validates by page origin, not by calling app, so
 * this is the only way to get a native sign-in past Supabase's Attack Protection CAPTCHA —
 * see ActorsVoice's docs/plans/box-office-phase-0.md and the app's TurnstileChallenge.kt.
 */
export default function MobileCaptchaPage() {
  const [hasBridge, setHasBridge] = useState(false);

  useEffect(() => {
    setHasBridge(typeof window !== "undefined" && Boolean(window.AndroidTurnstile));
  }, []);

  function reportToken(token: string | null) {
    console.log(
      `reportToken: token=${token ? "present" : "null"} bridge=${Boolean(window.AndroidTurnstile)}`,
    );
    window.AndroidTurnstile?.onToken(token);
    console.log("reportToken: bridge call returned");
  }

  if (!hasBridge) {
    return (
      <div className="max-w-sm mx-auto mt-16 px-6 text-center text-sm text-gray-500">
        This page is used by the Actors Voice app during sign-in and isn't meant to be opened
        directly.
      </div>
    );
  }

  if (!turnstileConfigured) {
    return (
      <div className="max-w-sm mx-auto mt-16 px-6 text-center text-sm text-gray-500">
        CAPTCHA isn't configured in this environment.
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto mt-16 px-6 text-center">
      <p className="text-sm text-gray-500 mb-2">Completing sign-in check…</p>
      <TurnstileWidget onToken={reportToken} size="compact" />
    </div>
  );
}
