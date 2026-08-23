---
title: Refiner — improving import accuracy with on-device AI
summary: An optional on-device AI double-checks uncertain lines during import — speakers, stage directions, OCR slips.
date: 2026-08-23
---

Every publisher formats scripts a little differently, and OCR itself is never perfect. The
heuristic parser Actors Lines uses to turn a scan into structured lines gets most pages right on
its own, but on capable phones you can also turn on an on-device AI model that double-checks the
parts it wasn't confident about — speaker attribution, stage-direction vs dialogue, sound/light
cue typing, mis-merged or mis-split speeches, and OCR word slips.

## Why it's reliable on a tiny model

The model **verifies and corrects a draft — it never parses a page from scratch.** The heuristic
parser always runs first and produces a complete result with a per-line confidence score; the AI
is only ever shown the *low-confidence* lines, with the whole page and your existing cast list as
context, and asked to propose fixes. A correction only lands if it's sane — non-blank text, and a
speaker that's either a known cast member or a short, plausible new name, never a hallucinated
sentence. If the backend is unavailable, fails, or is switched off, the heuristic draft is
returned completely unchanged, byte for byte.

This also means the model can never invent a character. Import always matches a detected speaker
against your **existing** cast; a name the Refiner proposes that isn't already in your Characters
list still shows up as an unmatched speaker in Review, exactly as it would from the heuristic
parser alone.

## Getting started

Settings → "Script import" → "Improve accuracy with on-device AI" — **on by default**. It runs
entirely on your device, privately, and costs nothing to use. On a phone that doesn't support the
on-device model, the toggle simply has no effect: the heuristic parser's result stands, unchanged.

You still review everything before it's saved, exactly as you would without this turned on — the
Refiner only shifts how many lines need your attention during that review, it never removes the
review step itself.

## Which phones support it

The first backend uses Google's ML Kit GenAI Prompt API (Gemini Nano via AICore), which currently
requires a flagship-class device — Pixel 9/10, Galaxy S25 and similar. If the model is merely
*downloadable* but not yet installed, it provisions itself in the background and the import simply
skips AI assistance for that pass rather than blocking on the download. Cloud and smaller bundled
on-device models are planned for wider phone support.

## Scene-boundary suggestions (whole-play import)

A second, smaller use of the same on-device model helps with the whole-play import wizard's
boundary step. Scene starts are normally detected by a fast pattern match over "ACT"/"SCENE"
headings in the raw scanned text; if OCR garbles a heading badly enough ("5CENE TWO", "ACT lI"),
that pattern can miss it and silently skip past a scene break. When the pattern finds nothing in
the current search range and the on-device model is available, it's shown a short list of
candidate standalone lines and asked which ones look like plausible headings — widening the
search, never replacing your own confirmation. You still confirm every proposed boundary before
it's used, exactly the same as a boundary the pattern found on its own.

> **Tip:** If a scan came out particularly messy, "Teach from a sample page" (see the Calibration
> article) usually helps more than the Refiner alone — teaching the app your script's own
> conventions fixes the *heuristic* parser's confidence for that play going forward, which in turn
> means fewer lines ever need the AI's help.

## Related

[Scanning & importing scripts](scanning.md) · [Teaching the app your script's format](calibration.md)
