import { forwardRef, useEffect, useRef, useState } from "react";
import { Turnstile, type TurnstileInstance, type WidgetSize } from "@marsidev/react-turnstile";

const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

/** True once VITE_TURNSTILE_SITE_KEY is set (see .env.example). */
export const turnstileConfigured = Boolean(siteKey);

const COMPACT_QUERY = "(max-width: 30rem)";

/**
 * Night forms: the normal widget is 300px wide and clips in a 390px phone card; compact (150px) fits.
 * Follows the viewport (rotation, resize) through the media-query change event; TurnstileWidget
 * remounts when the value flips because Turnstile cannot change size after it renders.
 */
export function useNightWidgetSize(): WidgetSize {
  const [size, setSize] = useState<WidgetSize>(() =>
    typeof window !== "undefined" && window.matchMedia(COMPACT_QUERY).matches ? "compact" : "normal",
  );
  useEffect(() => {
    const mq = window.matchMedia(COMPACT_QUERY);
    const onChange = () => setSize(mq.matches ? "compact" : "normal");
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return size;
}

type Props = {
  onToken: (token: string | null) => void;
  size?: WidgetSize;
  /** Widget colour scheme; omitted keeps Turnstile's own default (auto). */
  theme?: "light" | "dark" | "auto";
  /** Replaces the default wrapper classes (night-look callers only). */
  className?: string;
};

/**
 * Renders the Cloudflare Turnstile challenge and reports the resulting token via
 * onToken. If VITE_TURNSTILE_SITE_KEY isn't set (e.g. local dev without a Turnstile
 * site configured) this renders nothing and never calls onToken — callers gate
 * "requires a token" behind `turnstileConfigured` so forms keep working without one.
 */
const TurnstileWidget = forwardRef<TurnstileInstance, Props>(function TurnstileWidget(
  { onToken, size, theme, className },
  ref,
) {
  const renderedSize = size ?? "normal";
  const firstSize = useRef(renderedSize);
  // A size change remounts the widget (key below), which discards any token already issued:
  // tell the form so submit stays disabled until the new challenge passes.
  useEffect(() => {
    if (firstSize.current !== renderedSize) {
      firstSize.current = renderedSize;
      onToken(null);
    }
  }, [renderedSize, onToken]);
  if (!siteKey) return null;
  return (
    <div className={className ?? "mt-4 min-h-[65px]"}>
      <Turnstile
        key={renderedSize}
        ref={ref}
        siteKey={siteKey}
        options={{ size: renderedSize, ...(theme ? { theme } : {}) }}
        onSuccess={onToken}
        onExpire={() => onToken(null)}
        onError={() => onToken(null)}
      />
    </div>
  );
});

export default TurnstileWidget;
