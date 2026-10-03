---
title: Running a scene — Practice and Rehearsal basics
summary: The everyday mechanics common to every Practice and Rehearsal run — starting, the countdown, pausing, scoring and finishing.
date: 2026-10-03
---

Once a scene has been taught (see [Teach & Fill-in-Teach](teach-basics.md)), **Practice** and
**Rehearse** are the two ways to actually run it. This article covers the mechanics common to
both; each run mode's own distinctive features — how much of your line shows, cue-to-cue
filtering, and so on — have their own articles, linked below.

## Practice vs Rehearsal

- **Practice** is the read-along / memorisation / drilling mode: your own lines are scored by
  speech recognition as you say them, and you can choose how much of each line is hidden
  beforehand (see [Progressive line reveal](reveal-modes.md)).
- **Rehearsal** is the fuller, less-interrupted run-through: other characters are spoken by TTS,
  your own lines are still listened to and scored, but the emphasis is a continuous performance
  rather than a stop-and-check loop. Other characters' lines reveal themselves as the run reaches
  them rather than being visible ahead of time — see
  [Rehearsal's line-by-line reveal](rehearsal-reveal.md).

## The header and the ⋮ menu

- The header over the script now reads just the scene, e.g. "Act 1, Scene 2" — no show name, no
  page number and no "Practice"; Teach, Fill-in-Teach and Edit match (Edit also drops the company
  line), while Rehearse and the scene-list cards are unchanged.
- Where the round "?" help icon used to sit there is now a small grey page indicator: "p 56" when
  the whole screen is one page, or "p 56/57" when the first and last pages on screen differ. It
  hides if the scene has no page numbers and stays visible during a run. See
  [Page breaks — keeping the printed page together](page-breaks.md).
- The round help icon has moved into the ⋮ menu — "Help" is now its last item (Practice only).
  Near the bottom the menu runs: … Sections / a divider / Share Diagnostics / Help. "Share
  Diagnostics" is permanently greyed, since diagnostics are switched off, and the "Share
  Diagnostics" button that used to appear while paused is gone.
- The idle bottom bar keeps "Playing <character>" and the Total/Hidden/Ratio counts. "Run this
  scene" is now half-width on the right; the left half shows the show name with the month and
  year it opens underneath (from the play's performance "from" date, e.g. "October 2026") — blank
  if no date is set.

## Starting a run

Tap **"Run this scene"**, or a section's own **"Run section N"** chip (see
[Sections — drilling part of a scene](sections.md)). A "Select run type" dialog asks how you want
your own lines to appear for this run — **As-is** uses whatever you've already set per line
individually; the other options (Blank — guide kept, All — blank space, First Word, First Letters,
Random Words, All Shown) apply uniformly for this run only, without changing your saved per-line
choices. A 3-2-1 countdown
follows, during which the app finishes warming up text-to-speech and speech recognition so the
run starts cleanly the moment the digits hit zero.

Both Practice and Rehearse also show a volume warning before a run: it flags the media volume
being off, and/or the notification volume being on, which makes the speech recognizer beep on
every line.

## While it's running

Other characters' cues play automatically, one after another, at the pace set by Settings →
"Pace (ms)" (see [Pace between lines](run-pace.md)). When the run reaches one of your own lines,
it starts listening: Practice scores what you say against the expected text as you speak;
Rehearsal listens for you to finish the line and simply moves on. A **Pause** button is always
available; **Continue** skips ahead of whatever wait is currently happening (a cue line playing,
your own countdown) without needing to say anything.

Search is available when a run is **idle, complete or stopped** — not while it's actively running
or paused, since re-pointing the active line mid-run would desync the run. The hide/reveal columns
above the script stay usable throughout.

## Pausing, resuming and stopping

Pause at any point and either **Resume** (pick up exactly where you left off) or **Restart**
(take the current line again from the top) — which one the on-screen button offers, and what
"continue" defaults to, is controlled by Settings → "After a pause, the button" (see
[Voice commands — a hands-free reader](voice-commands.md), which also covers doing all of this
hands-free by voice). A run ends itself once it reaches the scene's last line, or you can stop it
early — in Practice via "Exit the Run" (which first shows an accuracy summary for what you ran so
far), in Rehearsal immediately.

## Related

[Teach & Fill-in-Teach — preparing a scene](teach-basics.md) ·
[Progressive line reveal](reveal-modes.md) · [Cue-to-cue mode](cue-to-cue.md) ·
[Pace between lines](run-pace.md) · [Voice commands](voice-commands.md)
