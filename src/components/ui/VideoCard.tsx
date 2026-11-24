import LiteYouTube, { VIDEO_PRIVACY_NOTE, type VideoPoster } from "../tutorials/LiteYouTube";

export { VIDEO_PRIVACY_NOTE };

/**
 * Click-to-load YouTube card. Wraps the tutorials LiteYouTube player (the single click-to-play
 * primitive): nothing is requested from YouTube until play is pressed, and a blocked frame always
 * shows LiteYouTube's "Watch on YouTube" escape link (DEF547).
 */
export default function VideoCard({
  videoId,
  title,
  duration,
  description,
  poster,
  vertical,
  headingLevel = 3,
}: {
  videoId: string;
  title: string;
  duration?: string;
  description?: string;
  /** Self-hosted poster (public/video-posters/...). Without it a labelled placeholder box is shown. */
  poster?: VideoPoster;
  /** Portrait (9:16) frame for a YouTube Short. */
  vertical?: boolean;
  headingLevel?: 2 | 3 | 4;
}) {
  if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;

  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";
  return (
    <article className="al-video">
      <LiteYouTube videoId={videoId} title={title} poster={poster} vertical={vertical} />
      <div className="al-video__meta">
        <Heading className="al-video__title">{title}</Heading>
        {duration ? <p className="al-video__duration">{duration}</p> : null}
        {description ? <p className="al-video__desc">{description}</p> : null}
      </div>
    </article>
  );
}
