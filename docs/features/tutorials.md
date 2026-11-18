# Tutorials page (`/tutorials`)

**Purpose:** a separate page listing about 20 short how-to videos (title, duration, poster, one or two sentences, optional category). Decision: WIP 257 D4 (videos live on their own page, not as a hero embed). Until videos exist the page shows "Videos coming soon".

**Status:** live with one video ("Introduction to the scene list", 2:45, a YouTube Short, so `vertical: true`: portrait 9:16 card, max 20rem wide). Linked as "Videos" in the signed-out nav, the signed-in nav (night look only, as Support, to avoid header wrap) and the footer Help column; listed in `sitemap.xml` and `llms.txt`. `noindex` applies only if the list is empty again. No poster yet: the card shows the "Poster image to come" placeholder until a self-hosted frame is added.

**Key files**
- `src/content/tutorials.ts`: the typed `TUTORIALS` array. One object per video; this is the only file to edit to add a video.
- `src/pages/TutorialsPage.tsx`: list/grid, optional category groups, empty state.
- `src/components/tutorials/LiteYouTube.tsx`: click-to-load player. No request to YouTube until the play button is pressed; only `youtube-nocookie.com` is used; poster is self-hosted. The player iframe is sandboxed (`PLAYER_SANDBOX`: scripts, same-origin, presentation, popups only; no top navigation, forms or downloads).
- `src/styles/tutorials.css`, `src/styles/lite-youtube.css`: styling, tokens only.
- `src/components/Layout.tsx`: "Videos" nav entries; `src/components/Footer.tsx`: footer link.

**Adding a video:** add an entry to `TUTORIALS` (`id`, `videoId` = the 11-character YouTube id, `title`, `duration` such as `"1:10"`, `description`, optional `category`, optional `poster`, `vertical: true` for a Short). Poster files go in `public/video-posters/<videoId>.webp`, 1280x720, made from our own frame (never fetched from YouTube by the visitor's browser; `img-src` stays `'self' data:`).

**CSP:** `frame-src` already allows `https://www.youtube-nocookie.com` (also used by KB article embeds). No change in this feature.

**Privacy wording:** the line "Plays from YouTube when you press play. YouTube may then set cookies." is a placeholder for Clarity/Holly to approve; the privacy page already describes the click-to-play YouTube embed (youtube-nocookie.com, cookies, Google policy).
