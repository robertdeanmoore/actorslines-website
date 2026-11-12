# Self-hosted fonts

Sora and Inter, variable woff2, served from our own origin. Both are licensed under the SIL Open
Font License 1.1 (full texts: `OFL-Sora.txt`, `OFL-Inter.txt`).

## Source

Unmodified Google Fonts subsets as repackaged by Fontsource (`@fontsource-variable/sora@5.3.0`,
`@fontsource-variable/inter@5.3.0`, fetched once with `npm pack` on 2026-11-11; the packages are not
dependencies of this repo). Files are only renamed (`<family>-<subset>-wght[-italic].woff2`); no
glyph, table or name was changed, so these are not Modified Versions under the OFL.

| File | Family, style | Declared weights (file covers more) | Bytes | sha256 |
|---|---|---|---|---|
| `sora-latin-wght.woff2` | Sora normal, latin | 600 800 | 33652 | fa26406eeda9a3c6ec3d9ea8813c3045d6dc755e30c716d5c094e8ef43be5a7f |
| `sora-latin-ext-wght.woff2` | Sora normal, latin-ext | 600 800 | 15548 | c163c536f68befd99a83d4f17e8b88030e7f54229688a45c44f70c7149db7385 |
| `inter-latin-wght.woff2` | Inter normal, latin | 400 600 | 48256 | 3100e775e8616cd2611beecfa23a4263d7037586789b43f035236a2e6fbd4c62 |
| `inter-latin-ext-wght.woff2` | Inter normal, latin-ext | 400 600 | 85068 | 34b9c504cab7a73e37b746343a449132e56cf7b5481af2cb81dc74dcff25c956 |
| `inter-latin-italic-wght.woff2` | Inter italic, latin | 400 500 | 51832 | 7291b5970da2237441273c03b424a504b70b18f09791473fab99687dcc314720 |

First-view payload once preloaded (slice 1): Sora latin + Inter latin = 81908 bytes (budget 120 KB).

## Licence notes

- Sora: Copyright 2019 The Sora Project Authors (https://github.com/sora-xor/sora-font).
- Inter: Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter).
- Neither copyright line declares a Reserved Font Name (the OFL text only defines the term), so the
  family names may be used as-is. If a file is ever subset or otherwise modified, re-check this first.
- Web use needs no on-page credit; the licence texts ship beside the fonts as required for redistribution.
- Fonts are never inlined as base64 (CSP `font-src 'self'`). Replace a file only under a new versioned
  name; never overwrite one that has been served with immutable caching.
