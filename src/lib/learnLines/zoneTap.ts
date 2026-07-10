// Port of the app's 4-zone tap strip + reveal-mode cycling state machine
// (PracticeScreen.kt's tap-zone split + PracticeViewModel.applyZoneTap).

import type { RevealMode } from "./types";

const ZONE_MODES: readonly RevealMode[] = ["HIDDEN", "FIRST_WORD", "FIRST_LETTERS", "RANDOM"];

const PARTIAL_HINT_MODES = new Set<RevealMode>(["FIRST_WORD", "FIRST_LETTERS", "RANDOM"]);

/** Maps an x tap offset (0..width) to the tapped zone's target mode — left→right =
 *  Hidden / First word / First letters / Random. */
export function zoneModeForTap(offsetX: number, width: number): RevealMode {
  const zone = Math.min(3, Math.max(0, Math.floor((offsetX / width) * 4)));
  return ZONE_MODES[zone];
}

/** Given the line's current mode and the mode implied by the tapped zone, returns the new
 *  mode. Verbatim port of PracticeViewModel.applyZoneTap:
 *  - tapping the Hidden zone while already in a partial-hint mode is an escape hatch to VISIBLE
 *  - tapping a different zone switches straight to that zone's mode
 *  - re-tapping the Hidden zone toggles Hidden -> Visible
 *  - re-tapping a hint zone toggles that hint -> Hidden
 */
export function applyZoneTap(current: RevealMode, zoneMode: RevealMode): RevealMode {
  if (zoneMode === "HIDDEN" && PARTIAL_HINT_MODES.has(current)) return "VISIBLE";
  if (current !== zoneMode) return zoneMode;
  if (zoneMode === "HIDDEN") return "VISIBLE";
  return "HIDDEN";
}
