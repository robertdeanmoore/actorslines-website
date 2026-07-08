import { forwardRef } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

/** True once VITE_TURNSTILE_SITE_KEY is set (see .env.example). */
export const turnstileConfigured = Boolean(siteKey);

type Props = { onToken: (token: string | null) => void };

/**
 * Renders the Cloudflare Turnstile challenge and reports the resulting token via
 * onToken. If VITE_TURNSTILE_SITE_KEY isn't set (e.g. local dev without a Turnstile
 * site configured) this renders nothing and never calls onToken — callers gate
 * "requires a token" behind `turnstileConfigured` so forms keep working without one.
 */
const TurnstileWidget = forwardRef<TurnstileInstance, Props>(function TurnstileWidget(
  { onToken },
  ref,
) {
  if (!siteKey) return null;
  return (
    <div className="mt-4">
      <Turnstile
        ref={ref}
        siteKey={siteKey}
        onSuccess={onToken}
        onExpire={() => onToken(null)}
        onError={() => onToken(null)}
      />
    </div>
  );
});

export default TurnstileWidget;
