---
title: Characters — managing your cast
summary: Add, edit and delete characters — names, who plays them, your own character, colour, photo and voice.
date: 2026-08-23
---

A play's Characters list is its cast: names, the actor behind each, which one is **your**
character, a per-character ink colour used to attribute lines throughout the app, an optional
neural TTS voice, and an optional photo.

**Set up your cast before importing a script.** Import never creates characters — it matches
each speaker it detects on the page against characters you've already added, and flags anything
it can't match for review. Importing into a play with no characters yet is blocked with an "Add
your characters first" prompt.

## Getting started

Open Characters from the Play List (the row icon on a play) or from Play Setup's top-bar
"Characters" icon.

- **Add** — tap "+", then fill in the character's name, the actor's name, tick "My character?"
  if this is the one you're playing, and pick a colour and a voice (see
  [Picking a voice for a character](voice-picking.md)).
- **Edit** — tap an existing character card to open the same fields for editing.
- **Delete** — tap the delete icon on a character's card; a confirmation names the character and
  warns it will be permanently removed from the play.
- **Photo** — tap the image icon on a character card. With no photo set yet, this opens the
  photo picker directly; once a photo exists, it instead opens a small dialog offering "Replace
  image" or "Remove image".

## Which character is "my character"

Only one character per play can be marked as yours at a time — it's the one whose lines get
hidden/revealed for study, scored in Practice, and timed in Teach/Fill-in-Teach. Right after
creating a brand-new play, a one-time prompt asks for your character's name directly so this
step can't be missed; "I'll do this later" skips it and you add the rest of the cast from the
Characters screen as normal.

Changing which character is marked as yours mid-play is allowed, but it isn't free: the app has
to recalculate taught line timings for the newly-selected character, and any teach timing
recorded for the previous one is cleared. A confirmation dialog warns you of this before the
change takes effect.

## Renaming cascades automatically

A character's name is stored directly on every line spoken by them (`LineEntity.speaker` is a
copy, not a reference), so renaming a character updates every line already attributed to them in
the same action — useful for fixing a typo (e.g. "PC Sterling" → "PC Stirling") without having to
touch the script itself.

There's no uniqueness check on character names: renaming a character to match another character
already in the play merges their lines under one name. This isn't prevented by the app, so avoid
doing it unless that's genuinely what you want.

## Colour and voice

Each character gets an ink colour used to attribute their lines throughout the reading view, and
an optional voice used for TTS playback in Teach, Practice and Rehearsal. See
[Picking a voice for a character](voice-picking.md) for assigning and previewing a stock voice,
and [Blending voices](blended-voices.md) if none of the stock voices fit.

## Related

[Scanning & importing scripts](scanning.md) · [Picking a voice for a character](voice-picking.md) ·
[Blending voices](blended-voices.md)
