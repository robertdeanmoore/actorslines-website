---
title: Pace between lines
summary: Dial how snappily one cue line leads into the next in Practice, Rehearsal and Teach — or overlap them.
date: 2026-07-10
---

The "Pace (ms)" setting controls how another character's line, a sound effect or a lighting cue
leads into the next one, in Practice, Rehearsal and Teach. It ranges from -1000 to 1000, and
defaults to 150ms.

## Positive values: a pause

- Works exactly like a fixed gap always has: after the line finishes, the run waits that many
  milliseconds before the next one starts. Lower is snappier; 0 means no wait at all.

## Negative values: overlap

- A negative Pace starts the next line's audio early, before the current one has finished — the
  two overlap, the way real overlapping dialogue does, for a quicker back-and-forth than 0ms
  alone can give you.
- Overlap only happens between two consecutive other-character cue lines, in Practice and
  Rehearsal. It never overlaps into a Skip marker, a sound effect, a lighting cue, or your own
  line — those always keep their own timing.

> **Tip:** Skip markers always use a fixed, snappy 100ms gap of their own — the Pace setting
> never affects how quickly a Skip card moves the run along.

> **Tip:** Teach mode accepts the same -1000 to 1000 range but treats negative values as 0 — it
> doesn't overlap audio yet.
