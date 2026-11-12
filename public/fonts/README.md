# Self-hosted fonts

Sora and Inter, variable woff2, served from our own origin. Both are licensed under the SIL Open
Font License 1.1 (full texts: `OFL-Sora.txt`, `OFL-Inter.txt`).

## Source

Unmodified Google Fonts subsets as repackaged by Fontsource (`@fontsource-variable/sora@5.3.0`,
`@fontsource-variable/inter@5.3.0`, fetched once with `npm pack` on 2026-11-11; `@fontsource-variable/literata@5.3.0`
fetched the same way on 2026-11-12, slice 1; the packages are not
dependencies of this repo). Files are only renamed (`<family>-<subset>-wght[-italic].woff2`); no
glyph, table or name was changed, so these are not Modified Versions under the OFL.

| File | Family, style | Declared weights (file covers more) | Bytes | sha256 |
|---|---|---|---|---|
| `sora-latin-wght.woff2` | Sora normal, latin | 600 800 | 33652 | fa26406eeda9a3c6ec3d9ea8813c3045d6dc755e30c716d5c094e8ef43be5a7f |
| `sora-latin-ext-wght.woff2` | Sora normal, latin-ext | 600 800 | 15548 | c163c536f68befd99a83d4f17e8b88030e7f54229688a45c44f70c7149db7385 |
| `inter-latin-wght.woff2` | Inter normal, latin | 400 600 | 48256 | 3100e775e8616cd2611beecfa23a4263d7037586789b43f035236a2e6fbd4c62 |
| `inter-latin-ext-wght.woff2` | Inter normal, latin-ext | 400 600 | 85068 | 34b9c504cab7a73e37b746343a449132e56cf7b5481af2cb81dc74dcff25c956 |
| `inter-latin-italic-wght.woff2` | Inter italic, latin | 400 500 | 51832 | 7291b5970da2237441273c03b424a504b70b18f09791473fab99687dcc314720 |
| `literata-latin-wght.woff2` | Literata normal, latin | 400 600 | 52496 | 9adbeac5b167fe5ad6c49d9e29aa0c76e2f1bb3b46bf4ebf12a9eca7d3525384 |
| `literata-latin-italic-wght.woff2` | Literata italic, latin | 400 | 53728 | ab198d6616c7cc966f26a4a5b28a3977dc47439640f09d9b3361226bd465c404 |

First-view payload once preloaded (slice 1): Sora latin + Inter latin = 81908 bytes (budget 120 KB).

## Licence notes

- Sora: Copyright 2019 The Sora Project Authors (https://github.com/sora-xor/sora-font).
- Inter: Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter).
- Neither copyright line declares a Reserved Font Name (the OFL text only defines the term), so the
  family names may be used as-is. If a file is ever subset or otherwise modified, re-check this first.
- Web use needs no on-page credit; the licence texts ship beside the fonts as required for redistribution.
- Fonts are never inlined as base64 (CSP `font-src 'self'`). Replace a file only under a new versioned
  name; never overwrite one that has been served with immutable caching.

## Literata (slice 1)

Learn Lines script text only (`.paperkit-script`); replaces the Google Fonts import that slice 1 removes.
Latin subset, normal and italic, never preloaded (fetched only on a page that renders script text).
Copyright 2017 The Literata Project Authors (https://github.com/googlefonts/literata); OFL 1.1 text in
`OFL-Literata.txt` (the copyright line declares no Reserved Font Name). Files only renamed, not modified.

## Fallback metrics (slice 1)

`"Inter Fallback"` and `"Sora Fallback"` in `src/styles/fonts.css` are `local("Arial")` faces with
`size-adjust`, `ascent-override`, `descent-override` set from the `@capsizecss/metrics@4.4.0` data
(`npm pack`, not a dependency): xWidthAvg Arial 913/2048, Inter Regular 978/2048, Sora Bold 517/1000.
size-adjust = (font xWidthAvg/upm) / (Arial xWidthAvg/upm); ascent/descent = metric/upm/size-adjust;
line-gap 0 for both fonts. Inter 107.12% / 90.44% / 22.52%; Sora 115.97% / 83.64% / 25.01%.
