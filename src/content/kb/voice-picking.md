---
title: Picking a voice for a character
summary: Assign and preview a stock neural voice per character, for TTS playback in Teach, Practice and Rehearse.
date: 2026-08-23
---

Every character in a play can have its own voice, used whenever they're spoken aloud by the app
— in Teach, Fill-in-Teach and Rehearsal, and for other characters' cue lines in Practice.

## The voice pack

Actors Lines ships ten neural voices (Kokoro, running entirely on-device), four of them British.
The voice pack has to be downloaded once before any of them can play — until then, every
character falls back to your phone's own built-in text-to-speech voice, which still works, just
without the natural cadence of the neural voices.

## Getting started

Open a character from the Characters screen (add or edit) and use the voice picker shown there:

- Tap any voice chip to assign that voice to the character.
- Tap the ▶ on a chip to preview it. Before the voice pack is downloaded, the first tap starts
  the download instead of playing anything; once it's installed, ▶ plays a short sample in that
  voice, and the currently-previewing chip is highlighted.
- Leaving a character on the default voice lets the app pick its own stock assignment.

## Under the hood

Loading the neural voice engine costs real time — a few seconds of native model setup the first
time it's needed in a session. Actors Lines shares one engine across the whole app and starts
warming it up as soon as you open a play's scene list, so by the time you actually start a run
the voice is usually already loaded; if it isn't, a short "Getting ready…" spinner covers the
gap instead of leaving dead air.

Playback speed is a single, global setting (Settings → Voice → "Reading speed") rather than
per-character — it applies to TTS voices and your own Selftape recordings alike.

## Beyond the stock voices

If none of the ten stock voices suits a character, you can mix two of them (including your own
previously-saved mixes) into a brand-new voice — see [Blending voices](blended-voices.md).
Blending happens once, at creation time, and costs nothing extra at playback: a blended voice is
exactly as fast as a stock one.

## Related

[Blending voices](blended-voices.md) · [Characters — managing your cast](characters.md)
