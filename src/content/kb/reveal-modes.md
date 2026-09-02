---
title: Progressive line reveal
summary: Tap a fifth of your own line to hide it, or leave just a hint behind.
date: 2026-09-02
---

Practice used to offer one choice for your own lines: fully shown or fully hidden. Now you can
wean yourself off the page gradually, choosing a different level for every line by where on it
you tap.

## The five reveal modes

There are five ways to conceal one of your own lines. Only **four** show as tap-columns at once —
you pick which four, and their order, in Settings (see "Choosing which columns you see" below).

- **Blank** — the whole line is concealed, but light pencil strokes stay where the words were, so
  you can still see roughly how long the line is and where it breaks. *This is what the column
  called "All" did before this version.*
- **Word** — shows just the first word; the rest is concealed with pencil strokes.
- **Letters** — shows the first letter of each word (plus any punctuation stuck to the end of that
  word, like a comma), e.g. "He's happy, she said" → "H h, s s". A standard learning technique.
- **Random** — shows a random selection of the line's words (half by default), re-shuffled every
  time the line goes back into this mode. The share is set by *Random words shown* (below).
- **All** — like **Blank**, but the pencil guide is removed as well. Nothing is left but empty
  space of the same height — the line gives away nothing about its length or shape. **New in this
  version.**

## The tap columns

Picture your line's box split into five equal strips, left to right — it doesn't matter how many
rows the text wraps onto, the whole block counts.

- The **leftmost** strip is the **Memory** column: tap to reveal a saved memory link, long-press
  to create or change one. It's not a reveal mode.
- The next **four** strips are your four chosen reveal modes, in your chosen order. By default:
  **Blank · Word · Letters · Random**.
- A faint vertical line near the right edge marks where your columns end. The narrow strip beyond
  it (where the search icon and scrollbar sit) is not a column — a tap there does nothing. Before
  this version a tap there flipped the line to the rightmost mode by mistake.

> **Tip:** Settings → "Random words shown" lets you change how much of the line stays visible in
> Random mode, from 10% to 100% in steps of 10 — a lower number is a harder test. It applies to
> both the tap column and the "Show/Hide All" Random bulk action, and is personal (not shared
> with the cast).

## Switching between modes

Tapping a *different* column normally switches straight to that mode. The re-tap behaviour:

| Line is currently… | Tap **Blank** | Tap **All** | Tap a hint (Word / Letters / Random) |
|---|---|---|---|
| Fully shown | → Blank | → All | → that hint |
| Blank | → fully shown | → All | → that hint |
| All | → Blank | → fully shown | → that hint |
| showing a hint | → fully shown | → fully shown | tap the same hint again → Blank; a different hint → that hint |

So: tapping **Blank** or **All** a second time brings the line back to fully visible. Moving
between **Blank** and **All** just adds or removes the pencil guide. Tapping **Blank** or **All**
while a hint is showing reveals the line in full instead of hiding it further — if the hint
wasn't enough, the next step is to see it, not obscure it more. Tapping an active hint column
again hides the line outright.

> **Tip:** Hidden letters and words keep their exact place on the page, so the shape of the line
> never changes, only what's readable — except **All**, which also removes the pencil guide, so
> that span is genuinely empty.

## Choosing which columns you see

At the bottom of the Run Mode settings menu, **"Hide and reveal columns"** lists all five modes.
A box encloses the top four — those are your columns, **top to bottom = left to right** on the
Practice screen. The fifth mode sits just below the box.

- **Drag to reorder.** Drag the mode outside the box *into* the box and the bottom one drops out
  — there are always exactly four in and one out.
- Each row shows the mode's name, a one-line description and a tiny preview of a sample phrase in
  that mode.
- Saved as you change it — there's no Save button. The Practice screen updates the moment you go
  back, no restart needed.
- **Removing a mode changes nothing you've already set.** A line you'd set to a mode that's no
  longer a column keeps displaying that way; you just can't newly apply that mode by tapping a
  column until you add it back. It's still available in the "Show/Hide All" and run-type menus.
- Out of the box the columns are **Blank · Word · Letters · Random**, with **All** the excluded
  one — exactly the layout before this version, so the only thing you'll notice on updating is
  the leftmost label changing from "All" to "Blank".

## Setting it for a whole scene or section

- The three-dot menu's "Show/Hide All" opens all the options — Show All, Blank — guide kept,
  All — blank space, First word, First letters, Random — as one-off actions for every line in the
  scene, each with a confirmation. **These menus always offer every mode, regardless of which
  four you have as columns.**
- Tapping a section's "Start of section" label offers the same, scoped to just that section
  (long-press the same label instead to delete the section).

> **Tip:** Your choice for each line is saved as you go, survives leaving the screen or a crash,
> and travels with a personal backup — but not with a copy shared to the rest of the cast, since
> it's your own study progress. The chosen column set travels only in a full-app backup.

## Choosing a run type

"Run this scene" and a section's "Run section N" chip ask first: As-is, Blank — guide kept,
All — blank space, First Word, First Letters, Random Words, or All Shown. This overrides every
line in the run uniformly for that run only — your individual per-line settings are never
changed. Every option is offered regardless of your chosen columns.

> **Tip:** "As-is" is the one option that changes nothing — each line runs at whatever level you'd
> already set it to individually.

> **Tip:** "Practice Again" after finishing a whole-scene run skips this dialog and reuses
> whichever run type you just used.

## Revealing a line during a run

If you blank on one of your own lines mid-run, you don't have to stop. The same columns work
during a run — tap **Blank** (or **All**) on the line to see the whole thing, or a hint column
for just a nudge.

Taps made during a run are **temporary**. They last only until you next tap Resume, Restart or
Continue, at which point every line goes back to the run's own reveal setting. Your saved
per-line reveal levels are never touched by a mid-run tap.

The first tap of **Blank** or **All** always does the useful thing for where the line is right
now:

- If the line is **hidden or showing only a hint**, the first tap reveals it in full.
- If the line is **already fully shown** (for example in an "All Shown" run), the first tap hides
  it.

Tap again to toggle back. (Before an August 2026 fix, the first such tap in a run that started
with lines hidden did nothing visible and you had to tap twice — that's resolved.)

> **Tip:** Pausing a run (rather than tapping a line) still shows every line in full while you're
> paused, and hides them again when you resume — that's separate from these per-line taps.
