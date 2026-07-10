// Byte-exact TS port of the Android app's RevealRanges.kt + ScriptText.kt (parenthetical
// exclusion). Ranges here are half-open [start, end) tuples — the TS equivalent of the
// Kotlin IntRange values built via `until`.

import type { RevealMode } from "./types";

export type Span = [number, number];

// A parenthesised or square-bracketed span (non-nested) — matches ScriptText.kt's bracketSpan.
const BRACKET_RE = /[(\[][^)\]]*[)\]]/g;

// Kotlin's `\p{Punct}` is the POSIX punctuation class (ASCII punctuation only), NOT the
// Unicode `P` general category — must not use `\p{P}` here, it would over-match.
const ASCII_PUNCT_TAIL_RE = /[!"#$%&'()*+,\-./:;<=>?@[\]^_`{|}~]+$/;

const WORD_RE = /\S+/g;

/** Character spans of bracketed asides within `text` — never concealed, in any mode. */
export function parentheticalRanges(text: string): Span[] {
  const spans: Span[] = [];
  for (const m of text.matchAll(BRACKET_RE)) {
    spans.push([m.index, m.index + m[0].length]);
  }
  return spans;
}

function overlaps(a: Span, b: Span): boolean {
  return a[0] < b[1] && b[0] < a[1];
}

/** Word spans (half-open, ordered), excluding any word inside a bracketed aside. */
export function words(text: string): Span[] {
  const skips = parentheticalRanges(text);
  const out: Span[] = [];
  for (const m of text.matchAll(WORD_RE)) {
    const span: Span = [m.index, m.index + m[0].length];
    if (!skips.some((skip) => overlaps(span, skip))) out.push(span);
  }
  return out;
}

export function wordCount(text: string): number {
  return words(text).length;
}

/** The whole text minus any bracketed asides — the spans the highlighter band should cover
 *  (asides are never highlighted, matching drawHighlightOverText's skip rule). */
export function nonParentheticalSpans(text: string): Span[] {
  if (text.length === 0) return [];
  return subtract([0, text.length], parentheticalRanges(text));
}

/** `range` minus the `skips` (both half-open), as a list of non-empty half-open segments. */
function subtract(range: Span, skips: Span[]): Span[] {
  let segments: Span[] = [range];
  for (const [s, e] of skips) {
    const next: Span[] = [];
    for (const [a, b] of segments) {
      if (e <= a || s >= b) {
        next.push([a, b]);
      } else {
        if (s > a) next.push([a, s]);
        if (e < b) next.push([e, b]);
      }
    }
    segments = next;
  }
  return segments;
}

/** Character spans within `text` that should be concealed for `mode`. `shownWordIndices`
 *  (indices into `words(text)`) is only consulted for RANDOM — words not in that set are
 *  hidden — and ignored for every other mode. */
export function hiddenRanges(
  text: string,
  mode: RevealMode,
  shownWordIndices?: ReadonlySet<number>,
): Span[] {
  if (mode === "VISIBLE" || text.length === 0) return [];
  const wordRanges = words(text);
  if (wordRanges.length === 0) return [];

  let raw: Span[];
  switch (mode) {
    case "HIDDEN":
      raw = [[0, text.length]];
      break;
    case "FIRST_WORD": {
      const firstEnd = wordRanges[0][1];
      raw = firstEnd >= text.length ? [] : [[firstEnd, text.length]];
      break;
    }
    case "FIRST_LETTERS": {
      raw = [];
      for (const [s, e] of wordRanges) {
        const word = text.slice(s, e);
        const trailingMatch = word.match(ASCII_PUNCT_TAIL_RE);
        const trailingLen = trailingMatch ? trailingMatch[0].length : 0;
        const hideStart = s + 1;
        const hideEnd = e - trailingLen;
        if (hideStart < hideEnd) raw.push([hideStart, hideEnd]);
      }
      break;
    }
    case "RANDOM": {
      const shown = shownWordIndices ?? new Set<number>();
      raw = wordRanges.filter((_, i) => !shown.has(i));
      break;
    }
  }

  // Parenthetical asides are already excluded from `wordRanges`, but HIDDEN/FIRST_WORD build
  // one contiguous span that can still swallow an aside in the middle — punch it back out.
  const skips = parentheticalRanges(text);
  const result: Span[] = [];
  for (const r of raw) result.push(...subtract(r, skips));
  return result;
}

/** Picks the set of word indices to leave visible for RANDOM mode. Never persisted — re-rolled
 *  fresh every time a line (re-)enters RANDOM, matching the app exactly. */
export function rollRandomWords(
  text: string,
  previousShown?: ReadonlySet<number>,
  shownPercent = 50,
): Set<number> {
  const total = wordCount(text);
  if (total === 0) return new Set();
  const shownCount = Math.min(total, Math.round((total * shownPercent) / 100));

  const prevKey = previousShown ? [...previousShown].sort((a, b) => a - b).join(",") : null;
  let result: Set<number> = new Set();
  for (let attempt = 0; attempt < 5; attempt++) {
    const indices = Array.from({ length: total }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    result = new Set(indices.slice(0, shownCount));
    const key = [...result].sort((a, b) => a - b).join(",");
    if (key !== prevKey) break;
  }
  return result;
}
