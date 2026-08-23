---
title: Anonymous usage data
summary: Optionally share anonymous data about which features you use, so the app improves where it matters.
date: 2026-07-21
---

The app works entirely on your device and sends nothing anywhere unless you choose to turn on
"Share anonymous usage data" in Settings. It's off by default.

## What it does

When it's on, the app sends anonymous, non-identifying information about which features and
settings you actually use. That tells me — a solo developer — where to spend my time, so the
parts you rely on get the attention.

## What is and isn't sent

- Sent: which features you open, which settings you change, how often and how long you use the
  app, the app version, and a rough device model (the same detail a crash report already includes).
- A random ID is attached so events from one phone can be grouped together. It isn't linked to
  your name, email or any account — there's no account in this app — and you can reset it any
  time from Settings.
- Not sent: your scripts, your recordings, character names, or anything you type. None of your
  content ever leaves your device through usage data.

## Reporting a recognition problem

When the app mis-reads a scanned line during script import review, you can report it so
recognition improves. You'll always see exactly the short piece of text that will be sent and
have to tap Send — nothing is sent behind your back. This is the only case where a small piece
of script text is ever shared, and only with your per-report consent.

> **Note:** An earlier version of the app also let you report a *misheard spoken* line, from
> Practice's Line Review menu ("Ignore and report"). That option was removed from the UI in
> v3.3.0 — only a mis-scanned *import* line can be reported now. The underlying reporting
> infrastructure is shared with Scene Review, so this may return for spoken lines in future, but
> it isn't reachable today.

## Turning it off

Switch "Share anonymous usage data" off at any time. That deletes the random ID and stops all
collection immediately.

> **Tip:** Full details are in the privacy policy, linked from the same Settings section and at
> actorslines.app/privacy.
