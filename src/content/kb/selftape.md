---
title: Selftape mode — recording cues in your own voice
summary: Record other characters' lines yourself and hear your own voice in runs instead of the synthesised voice.
date: 2026-07-08
---

Selftape lets you record your own voice reading other characters' cue lines, then play those
recordings back in Practice, Rehearse and the Timers walk instead of the synthesised voice —
handy if you're rehearsing with a real scene partner's cadence in mind, or just prefer hearing
a real voice.

## Turning it on

- These three switches are set per play, from the settings menu (the Tune icon) on that play's
  card in the Play List — so one play can use Selftape while another still uses the synthesised
  voice.
- "Selftape mode" turns on recording in Add Line and Selftape sessions, in place of live
  transcription.
- "Also record my character's lines" additionally captures your own lines as recordings too —
  useful if you might switch which character is yours later, since every line ends up recorded
  either way.
- "Play my recordings in runs" makes Practice, Rehearse and Timers actually use the recordings;
  missing recordings always fall back to the synthesised voice.

## Recording your lines

- In Edit mode, the bottom row gains a "Selftape" button once Selftape mode is on, alongside
  "Timers", "Import" and "+ Scene". Tap Selftape to arm it — it fills solid to show it's armed
  — then tap any scene and choose "All lines" to walk through the whole scene, or "Missing
  recordings only" to jump straight to the lines that still need one, or Cancel to back out.
  Tap Selftape again to disarm it.
- Tick "Cue-to-cue only" in that dialog to record just the lines a Cue-to-cue Practice/Rehearse
  run will actually use, instead of the whole scene — handy once you know you'll always run
  this scene in Cue-to-cue mode. The Timers "Choose teaching mode" dialog has the same checkbox
  for teaching.
- Tick "Sections only" instead to scope to whatever sections you've already marked out in
  Practice for that scene — every character's line inside those sections, not just your own, so
  you can drill a whole exchange. It's greyed out until the scene has at least one Practice
  section, and ticking it un-ticks "Cue-to-cue only" (only one can be on at a time).
- Each line shows Record, then Save (saves and closes) or Save & Next (saves and moves on) —
  the same pair of buttons as Add Line's Save / Save & Add.
- Each scene card shows a small status box: the top row ("All:") shows the whole scene's
  microphone and clock (Timers) status — red/amber/green, same as before. The second row
  ("C2C:") repeats both for just the Cue-to-cue-relevant lines, so you can tell at a glance
  whether you're done recording everything a Cue-to-cue run will need, even if the whole-scene
  row is still red.

## Adding new lines while Selftape is on

In the Scene Editor's Add Line screen, tapping a character records your voice instead of
listening for speech — the text is filled in automatically afterwards, in the background, so
you don't have to wait for it before saving.

> **Tip:** The first time you turn Selftape on, download the transcription model from
> Settings → Selftape so recorded lines get their text automatically — until then, a fresh
> recording just shows "(recorded cue)" as a placeholder.

## Managing storage

- Settings → Storage shows where recordings live on your device, plus a breakdown of space
  used — Recordings, the TTS model (Kokoro), the transcribe model (Zipformer), the app's own
  code, and a Total.
- "Delete all voice recordings" removes every Selftape recording on this device and turns
  Selftape mode off for every play — a double confirmation reminds you to export your play(s)
  first if you're about to move to a new device.
- "Delete TTS model" frees the space used by the on-device neural voice. It disables the
  neural voice — Timers, Practice and Rehearse fall back to your device's built-in voice until
  you download the TTS model again from the same screen. Handy if you only ever use Selftape
  and don't need the synthesised voice at all.
