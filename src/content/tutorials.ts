import type { VideoPoster } from "../components/tutorials/LiteYouTube";

export type Tutorial = {
  /** Unique slug, used as the React key. */
  id: string;
  /** 11-character YouTube video id. */
  videoId: string;
  title: string;
  /** Display text such as "1:10" (minutes:seconds), supplied by Robert with the video. */
  duration: string;
  /** One or two plain sentences. */
  description: string;
  /** Optional heading to group under, e.g. "Getting started". */
  category?: string;
  /** Self-hosted poster in public/video-posters/ (1280x720 webp). */
  poster?: VideoPoster;
};

/**
 * Robert adds one object per video here (about 20 planned). Empty means the page shows
 * "Videos coming soon".
 *
 * To add an entry, append a Tutorial object with a unique `id` (the React key), the
 * 11-character `videoId` from the YouTube URL (the part after `v=` or `/embed/`),
 * `title`, `duration` (for example "1:10") and `description`. An optional `category`
 * groups videos under that heading; videos without one appear last under "More videos".
 * The optional `poster` is a self-hosted image kept at `/video-posters/<videoId>.webp`,
 * 1280x720 webp, passed as `{ src, width: 1280, height: 720 }` (add `srcSet` for a 2x file).
 */
export const TUTORIALS: readonly Tutorial[] = [];
