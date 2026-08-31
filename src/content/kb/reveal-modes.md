---
title: Progressive line reveal
summary: Tap a quarter of your own line to hide it, or leave just a hint behind.
date: 2026-07-08
---

Practice used to offer one choice for your own lines: fully shown or fully hidden. Now you can
wean yourself off the page gradually, choosing a different level for every line by where on it
you tap.

## The four tap zones

Picture your line's box split into four equal strips, left to right — it doesn't matter how
many rows the text wraps onto, the whole block counts.

- Left quarter (including the character name) — Hidden: the whole line disappears.
- Second quarter — First word: only the opening word stays.
- Third quarter — First letters: just the first letter of every word remains (plus any
  punctuation stuck to the end of a word, like a comma or semicolon).
- Right quarter — Random: a random selection of the words stay (half by default), reshuffled
  every time you pick this zone again.

> **Tip:** Settings → "Random words shown" lets you change how much of the line stays visible
> in Random mode, from 10% to 100% in steps of 10 — a lower number is a harder test. It applies
> to both the tap zone and the "Show/Hide All" Random bulk action, and is personal (not shared
> with the cast).

> **Tip:** Tap the Hidden zone a second time to bring the line back to fully visible. Tap any
> of the other three zones a second time and the line goes fully hidden instead — if the hint
> wasn't enough, hide it outright rather than spoil it by fully revealing it.
>
> Tapping a *different* zone normally switches straight to that new level, whatever it was
> doing before — with one deliberate exception: tapping the Hidden zone while a hint mode
> (First word/First letters/Random) is already showing doesn't hide the line further. It reveals
> the line fully instead, on the logic that if a hint wasn't enough, the next step is to just
> show it, not obscure it more. (`PracticeViewModel.applyZoneTap()`.)

> **Tip:** Hidden letters and words keep their exact place on the page — a pencil-guide mark
> stands in for them — so the shape of the line never changes, only what's readable.

> **Tip:** A small reminder of the order — "Show/Hide all | First word | First letters |
> Random" — sits just above the line list, lined up with the four zones underneath.

## Setting it for a whole scene or section

- The three-dot menu's "Show/Hide All" opens the same five options — Show All, Hide All, First
  word, First letters, Random — as one-off actions for every line in the scene, each with a
  confirmation since it overrides any per-line choices you've made.
- Tapping a section's "Start of section" label offers the same five options, scoped to just
  that section (long-press the same label instead to delete the section).

> **Tip:** Your choice for each line is saved as you go, survives leaving the screen or a
> crash, and travels with a personal backup — but not with a copy shared to the rest of the
> cast, since it's your own study progress.

> **Tip:** Pausing a run always shows every line in full so you can catch your breath — your
> individual settings are untouched underneath and come straight back once you stop.

## Choosing a run type

"Run this scene" and a section's "Run section N" chip now ask first: As-is, All Hidden, First
Word, First Letters, Random Words, or All Shown. This overrides every line in the run uniformly
for that run only — your individual per-line settings are never changed, and are exactly as you
left them once the run ends.

> **Tip:** "As-is" is the one option that changes nothing — each line runs at whatever level
> you'd already set it to individually, instead of the old always-hidden default.

> **Tip:** "Practice Again" after finishing a whole-scene run skips this dialog and reuses
> whichever run type you just used.

## Revealing a line during a run

If you blank on one of your own lines mid-run, you don't have to stop. The same four tap zones
work during a run — tap **All** on the line to see the whole thing, or **First word** /
**First letters** / **Random** for just a nudge. (The leftmost **Memory** zone still shows a
saved memory link, same as always.)

Taps made during a run are **temporary**. They last only until you next tap Resume, Restart or
Continue, at which point every line goes back to the run's own reveal setting. Your saved
per-line reveal levels — the ones you set outside a run — are never touched by a mid-run tap.

The first tap of the **All** zone always does the useful thing for where the line is right now:

- If the line is **hidden or showing only a hint**, the first **All** tap reveals it in full.
- If the line is **already fully shown** (for example in an "All Shown" run), the first **All**
  tap hides it.

Tap **All** again to toggle back. Before an August 2026 fix, the first **All** tap in a run that
started with lines hidden did nothing visible and you had to tap twice — that's resolved.

> **Tip:** Pausing a run (rather than tapping a line) still shows every line in full while
> you're paused, and hides them again when you resume — that's separate from these per-line
> taps.
