---
title: Backing up and sharing a play
summary: Save a play to your device, or send it straight through email, Drive, Dropbox and more.
date: 2026-11-22
---

Tap the share icon on a play card to back it up or hand it to someone else. There are four
options, in two pairs.

## Saving to your device

- "Back up this play" — a full-fidelity copy (your character, positions, Learn progress, cover
  image position) saved wherever you choose. Restoring it asks no questions. It now also includes
  your accuracy history (the heat map and Line Review history), so it survives moving to a new
  phone or restoring. Your [notes](notes.md) and memory links are included too.
- "Export for cast" — the same play stripped of your personal progress, so whoever imports it
  picks their own character. Use this to hand the script to a fellow cast member. It never
  includes your accuracy history, notes or memory links — they're yours alone.
- Both open the system "Save" screen — pick a folder (including a cloud-backed one like Drive,
  if it's set up as a storage location) and the file is written there.

Android's own backup (to your Google account) and moving to a new phone also bring your plays
and notes across. Your sign-in and licence are deliberately left out, so after a Google restore
or a new-phone transfer you sign in again; your plays and notes are unaffected.

## Sharing through another app

"Share backup..." and "Share for cast..." build the same two files, but instead open the
standard Android share sheet — the same chooser you see throughout the OS — so you can send
the file directly through Gmail, WhatsApp, Dropbox, OneDrive or any app you have installed that
accepts a file. The full-app .zip backup also includes your accuracy history now, while cast
files never do.

## What each backup includes

- Your own safety copies ("Back up this play" and the full-app `.zip`) hold everything personal:
  your character and positions, Learn progress, cover image position, accuracy history,
  [notes](notes.md) and memory links.
- **My Library Script Analysis reports** are included in the whole-app `.zip` disaster-recovery
  backup when the backup toggle is on (it's on by default). They are never included in a
  single-play `.json` backup ("Back up this play") or a cast export ("Export for cast" / "Share for
  cast..."), so a script passed to a fellow cast member never carries your analysis. See
  [Script analysis](script-analysis.md).
- **OpenRouter API keys are never included in any backup** — not the `.zip`, not a single-play
  export, and not Google's Android backup. The key stays only on your phone.

## File format version

- Every export is now written in format version 34, and the version is always stored in the file.
- Older app versions refuse every new file with an "Unsupported schema version" message, so
  everyone on a cast should update before files are passed around.
- The website's Learn Lines reader accepts version 34 files and shows page breaks (see
  [Page breaks — keeping the printed page together](page-breaks.md)).

> **Tip:** Use "Back up this play" for your own safety copy, and either Share or Export for
> cast when getting a script to someone else — Share is quicker if you're sending it through an
> app you already have open mentally (like email); Export for cast is quicker if you'd rather
> just drop the file into a shared folder yourself.
