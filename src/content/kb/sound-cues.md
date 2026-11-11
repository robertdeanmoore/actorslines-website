---
title: Sound cues — playing a sound between lines
summary: Add a short sound to a scene, trim it, set its volume, and preview or stop it before a run.
date: 2026-11-11
---

A sound cue is a short audio file (under 1 MB) that plays in Practice between lines. Use it
for a door, a phone, a crowd or anything else the scene calls for. You can preview it, trim it
and set its volume while you edit.

## Playing and stopping

- In the add and edit dialogs, the **Play** button starts the sound. It becomes **Stop** the
  moment you press it.
- In Practice, tapping the sound's row plays it. Tapping the row does not move your place in the
  run. If the run is paused, the tap still sets the point the run resumes from.
- Only one sound plays at a time across the app. Starting another sound stops the first.
- Leaving the dialog, choosing a different file, pausing, cancelling, or leaving Practice all
  stop the sound.
- If the file is missing, the app shows "Sound file not found".

## Trimming

- **Start at (seconds)**: where playback begins in the file. Leave it empty to start from the
  beginning.
- **Play for (seconds)**: how long to play, to one decimal place. Leave it empty to play the
  whole sound. A longer value than the file just plays to the end.
- When the play-for time runs out, the sound fades out over 250 ms, then Practice moves on.
- If the start point is past the end of the file, saving is blocked with "Start is past the end
  of the sound", as long as the file's length is known.
- Empty, negative or non-numeric values are flagged as errors on that field.
- Preview uses the values currently on screen, so you can hear the trim before you save.

## Volume

- A slider runs from 0 to 200 percent. The centre is the file's own level, and the slider
  snaps to 100 when it is within 3 points.
- Up to 100 percent lowers or keeps the level. Above 100 percent the app adds extra gain, about
  +6 dB at 200 percent.
- A change is heard the next time you press Play.
- Existing sound cues keep their previous behaviour: start 0, play-for 0 (whole sound), volume 100.

## Lighting cues

Lighting cues stay silent in a run. Only sound cues play audio.

## Backup and sharing

Trim and volume settings travel with the scene in personal and cast exports. The audio file
itself goes only in the full `.zip` backup.
