import { useCallback, useRef, useState } from "react";
import { supabase } from "../supabase";
import type { RevealMode } from "./types";

/** Optimistic, debounced, durable per-line reveal-mode state for one script. Tapping a line
 *  updates local state immediately (instant UI) and coalesces rapid re-taps into a single
 *  Supabase upsert ~300ms later. A per-key revision counter means a slow/out-of-order network
 *  response can never clobber a newer local tap. Failures are silent — the tap interaction
 *  must never block on the network. */
export function useRevealSync(scriptId: number | undefined) {
  const [revealByKey, setRevealByKey] = useState<Record<string, RevealMode>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const revisions = useRef<Record<string, number>>({});

  const hydrate = useCallback((map: Record<string, RevealMode>) => {
    setRevealByKey(map);
  }, []);

  const setReveal = useCallback(
    (key: string, mode: RevealMode) => {
      setRevealByKey((prev) => ({ ...prev, [key]: mode }));
      if (!scriptId) return;

      const rev = (revisions.current[key] ?? 0) + 1;
      revisions.current[key] = rev;
      if (timers.current[key]) clearTimeout(timers.current[key]);
      timers.current[key] = setTimeout(() => {
        if (revisions.current[key] !== rev) return; // superseded by a newer tap
        supabase
          .from("learn_line_states")
          .upsert(
            { script_id: scriptId, line_key: key, reveal_mode: mode, updated_at: new Date().toISOString() },
            { onConflict: "script_id,line_key" },
          )
          .then(({ error }) => {
            if (error) console.warn("Failed to save reveal state for", key, error);
          });
      }, 300);
    },
    [scriptId],
  );

  return { revealByKey, hydrate, setReveal };
}
