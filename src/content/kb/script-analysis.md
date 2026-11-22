---
title: Script analysis — reading your part with your own AI key
summary: Optional AI analysis of your scenes, run on your own OpenRouter account — private by design, with reports you save to My Library.
date: 2026-11-22
---

Script analysis is an optional set of tools that reads a play through the lens of a dramatic
question — given circumstances, objectives, beats, subtext — and writes you a report you can keep.
It uses AI, but it uses *your* AI: Actors Lines never runs the analysis on its own account. You
connect the app to your own [OpenRouter](https://openrouter.ai) account once, and from then on every
request goes straight from your phone to OpenRouter.

Because it runs entirely from your own phone and key, it works on any Android phone from **Android
8.0** upwards — there's no need for a Gemini Nano-class device or flagship hardware, and nothing is
sent to us.

## Connecting your OpenRouter account

Actors Lines uses Bring Your Own Key (BYOK), so you stay in control of what is spent and where your
script goes.

- **1-click sign-in.** Tap to sign in to OpenRouter through its OAuth PKCE flow. If you're an
  existing OpenRouter user this takes a moment, and the app mints a dedicated **"Actors Lines"**
  child API key for itself — with its own optional spend cap and reset interval, so your rehearsal
  spend stays isolated from your other workstreams.
- **Or paste a key.** If you'd rather use a key you already have, expand "Paste an existing scoped
  API key" and drop in an `sk-or-v1-...` key.
- **Dual balance readout.** Once connected you'll see both your **Key Spend Limit Remaining** and
  your **Account Credits**, so there's no guessing which pot a request will draw on.
- **Encrypted on your phone.** Your key is stored using Android's Keystore with AES-256-GCM. It is
  never included in Google cloud backups, device transfers, or `.zip` backups — see
  [Backing up and sharing a play](backup-and-share.md).

## Privacy: zero retention, no training

Analysis only ever reaches a provider that meets a strict privacy bar.

- Every request enforces **Zero Data Retention** (`zdr: true`, `data_collection: "deny"`) and asks
  for high-integrity quantisation (`fp8`, `fp16`, `bf16`), with OpenRouter's live latency and
  throughput telemetry choosing between qualifying endpoints.
- Your scripts and prompts are **never logged and never used to train AI models**.
- If no healthy ZDR endpoint is available, Actors Lines refuses to quietly fall back to a
  non-private provider. It stops rather than send your script somewhere it can't make that promise.

## Choosing a model

Rather than make you read a model list, the app offers three smart tiers:

- **Fast & Low-Cost** — quick and cheap, ideal for a single scene or a first pass.
- **Balanced (Recommended)** — the sensible everyday choice for most plays.
- **Deep Reasoning** — slower and dearer, for dense text or when you want the deepest thought.

You can also set an optional custom **maximum price ceiling** (`$/1M` tokens) and a **completion
cap** (`max_tokens`: `512`, `1,536` by default, or `4,096`) to bound how long each report may run.

## Dramatic prompt presets

Tick the questions you want answered, or add your own. The presets are:

- **Given Circumstances** — who, where, when, and what is already true before your first line.
- **Objectives & Super-Objective** — what your character wants in the scene, and across the play.
- **Obstacles & Conflict** — what stands in the way.
- **Action Verbs & Tactics** — the active doing-verbs behind each line.
- **Scene Beats & Turnings** — where the scene shifts and turns.
- **Relationship & Status Dynamics** — the power and connection between the characters.
- **Subtext & Unspoken Thoughts** — what's really being said beneath the words.
- **Textual & Period Context** — unusual words, references and conventions.

There's also a free-text box for **custom questions**, so you can ask something the presets don't
cover.

## Choosing what to send

To keep requests small and cheap, the app extracts a smart subset of the script rather than sending
the whole thing:

- **Play Header** — the title page and casting, for context.
- **Scene-Scoped** — just the scene you're working on.
- **Character Dialogue Windows** — your character's lines plus `±3` surrounding cue lines.

Before you send, a collapsible **"Included Script Context"** drawer lets you inspect exactly which
scenes are in the request and adjust the selection.

## The cost estimate and budget gate

Every send shows a pre-send estimate in both tokens and US dollars, with a three-tier gate so
nothing expensive ever runs by accident:

1. **Within Budget (Normal)** — Run Analysis is enabled and everything is fine.
2. **High-Context / High-Cost Warning (Soft Gate)** — an amber warning appears when your selection
   exceeds 75% of the model's context window, or the estimated maximum cost is over `$0.25`. You
   can read it and still go ahead.
3. **Over-Budget Hard Block (Hard Gate)** — Run Analysis is disabled when the context window would
   be exceeded, or your known balance or key limit is `$0.00`, with a direct link to add credits or
   adjust the key limit.

## Opt-in web research

An optional lookup of public historical and dramatic context is **off by default**, and only runs
when you switch it on. It uses sanitised queries, so your script text itself is never leaked into a
search.

## Reading the report and jumping to a line

When an analysis cites specific lines — for example `[A2.S3.L14]` — the citation becomes a tappable
pill. Tap it and Actors Lines jumps to **Practice**, scrolled to that exact line in context, so you
can work on it straight away. A **Back to Dossier** (Back to Analysis) action then returns you to
the report at the exact scroll position you left.

## Saving to My Library

Reports can be edited inline and saved to **My Library**, where they stay readable, searchable and
editable offline — even when you're disconnected from OpenRouter.

- Saving asks you to write your own **summary of 1–50 words**. It's deliberately manual — no
  AI-generated summary — both to encourage you to think the analysis through in your own words and
  to keep every library card short and scannable.
- Deleting a play keeps its saved reports by default. If you'd rather take them with it, tick the
  optional checkbox on the delete confirmation.

## Backing up reports

Saved My Library reports are included in whole-app `.zip` disaster-recovery backups when the backup
toggle is on (on by default). They are never included in single-play `.json` backups or cast
exports, and your OpenRouter key is never backed up by any of them. See
[Backing up and sharing a play](backup-and-share.md).

## Troubleshooting

- **Zero balance or key spend limit reached (`402`).** Add credits to your OpenRouter account, or
  raise the child key's spend limit. The dual balance readout tells you which one is empty.
- **"No ZDR endpoint available" (`404` / `503`).** No qualifying private endpoint is healthy at that
  moment. Wait a minute and try again — Actors Lines won't fall back to a non-private provider.
- **Price cap set too low.** If your maximum price ceiling is too tight, no responsive ZDR endpoint
  can meet it and requests fail. Raise the ceiling, or pick a lighter tier.
- **Time-to-first-token timeout (15 seconds).** The endpoint was slow to respond. Retry, choose
  **Fast & Low-Cost**, or send a smaller context selection.
- **Content-filter refusal.** Some models refuse stage violence or strong language. Try a different
  tier or model, and note that the refusal is the provider's filter, not Actors Lines.

> **Tip:** For a first go, connect your key, pick **Balanced**, tick **Scene-Scoped** and one or two
> presets, and run it on a single scene. It keeps the cost tiny, the wait short, and you'll see
> exactly what the reports give you before pointing them at a whole play.
