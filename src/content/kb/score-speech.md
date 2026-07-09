---
title: Score speech — running a whole speech start to finish
summary: Perform a whole speech in one continuous take, with a live accuracy readout as you go.
date: 2026-07-09
---

"Score speech" runs a whole speech as one continuous, listened-and-scored take, instead of the
usual stop-listen-score-next loop Practice uses between your lines and other characters' cues. A
speech has no cue lines to react to, so the app just listens the whole way through while you
perform it.

## Starting a run

- The "Score speech" chip sits on a speech's opening "Speech: name" row — tap it, pick a reveal
  mode from the "Select run type" dialog exactly as you would for "Run section N", then the usual
  3-2-1 countdown starts the run.
- The first time, you'll be offered a one-off download of the continuous listening model (about
  30 MB kept on your phone). Strongly recommended: it keeps the microphone open for your entire
  take, where the standard Android recogniser closes it between phrases and can miss the first
  words of each sentence.
- The chip is only offered while nothing else is running — start, pause and countdown states all
  disable it so a new run can't collide with one already in progress.

## While it's running

- A slim bar above the Pause button shows a live accuracy percentage and a running timer,
  updating as you speak — deliberately understated so it doesn't compete for attention with your
  performance.
- Text reveals progressively as you say it, word-coloured the same way a finished Practice line
  is (dim for correct, highlighted for a miss) — still respecting whichever reveal mode you
  picked at the start for anything you haven't reached yet.

## Pausing and resuming

- "Pause" stops listening completely and freezes the timer.
- While paused, tap any already-spoken word to set a resume point — tapping a different word
  replaces the mark, so you can refine it freely before committing. "Resume" restarts listening
  from that word (or from exactly where you paused, if you never tapped); everything from that
  point on is re-obscured and re-scored fresh.
- "Stop" scores whatever was captured — this is the normal way to finish a speech, not just an
  early-exit option, so press it once you've read the last line.
- If speech recognition stops working mid-run (it can, on long takes), the run pauses itself and
  shows "Listening stopped" — press Resume to carry on from where the tracking got to. It never
  silently pretends to still be listening.

## Results

- A finished speech run scores each original line exactly like a normal Practice run — it shows
  up in Accuracy Overview the same way, with no separate history to check.

> **Tip:** The tracking follows you word by word and re-checks everything against the whole take
> as it listens — so a word only ever turns red once you've clearly moved past it, and an early
> mishearing corrects itself as you keep speaking.
