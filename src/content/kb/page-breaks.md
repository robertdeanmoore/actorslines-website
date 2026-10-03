---
title: Page breaks — keeping the printed page together
summary: Mark where one printed page of the book ends and the next begins, so page numbers, search and the reader stay in step with your script.
date: 2026-10-03
---

Scripts are printed in pages, but the app works in scenes and lines. A page break is a small
marker recording where one printed page of the book ends and the next begins, so page numbers,
search and the page indicator stay in step with the book in your hand. It sits in the script as
an italic centred "Page" between two lines — visually much like a stage direction.

## Adding a page break

- Open the Edit screen. The bottom bar's insert buttons are now two rows of three: **Sound**,
  **Light**, **Stage** across the top, then **Skip**, **Page**, **Line** below. The other Edit
  controls are unchanged.
- Stand where you want the boundary and tap **Page**. The marker is inserted at that point.
- A page break marks the boundary only — it never pauses a run and is never read aloud.

## Where they show and hide

- Shown wherever stage directions are shown: **Edit**, **Practice**, **Teach**, **Fill-in-Teach**
  and the scan review screen.
- Not shown in **Rehearse**.
- Turning "Stage Directions" off in Practice (or "Hide stage directions" in Edit) hides page
  breaks too, together with stage directions, sound cues and lighting cues. If a filter leaves two
  page breaks next to each other, they show as one.

## Moving and deleting

- In **Edit**: tapping a page break does nothing. Long-press it for a "Delete page break?"
  confirmation, or drag its handle to move it.
- In **Practice**: tapping or long-pressing a page break does nothing.

## Automatic page breaks

Most breaks are added for you when a script is first read.

- **Scanning a script** puts one at every scanned sheet boundary — even where no page number is
  printed. Never at the very start or the very end of a scene.
- **Typing page numbers**: when you type a page number on a line and that page is higher than the
  page of the line before it, one break is inserted before that line. Only one, even for a jump of
  several pages, and none if a break is already there.
- Changing or removing a page number later never moves or deletes a break — tidy those by hand.
- Scripts imported before this version get no breaks added. Add them from Edit if you want them.

## Page inference

You only need to type a page number on the **first line of each page**. Every following line is
assumed to be on that page until the next numbered line; lines before the first numbered line take
the scene's start page from the scene list, if one is set.

This is worked out on the fly as you look at the script — nothing is written into your script to
fill the gaps. Edit's "P56" label still shows only the numbers you typed yourself, while the page
indicator, the scrollbar page flag and page-number search use the inferred pages.

## The page indicator

Where the round "?" help icon used to sit, the top bar now shows a small grey page number:

- "p 56" when every line on screen is on one page.
- "p 56/57" when the first and last pages on screen differ.
- Hidden altogether when the scene has no page numbers.
- Visible during runs.

## On the website

The Learn Lines reader on the website accepts version 34 export files and shows page breaks too,
so a script shared to the site reads with the same printed-page boundaries.
