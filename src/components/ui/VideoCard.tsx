import { useEffect, useRef, useState } from "react";

/** Wording is Clarity's to approve (spec 03 section 16). Shown once per video section, not per card. */
export const VIDEO_PRIVACY_NOTE = "Plays from YouTube when you press play. YouTube may then set cookies.";

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const LOAD_TIMEOUT_MS = 10000;

/** Same minimal sandbox as the tutorials LiteYouTube (Holly C-1): scripts, own origin, presentation, popups. */
const PLAYER_SANDBOX = "allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox";

type Phase = "poster" | "playing" | "failed";

/**
 * Click-to-load YouTube card. Until the play button is pressed nothing is requested from YouTube:
 * the poster is a self-hosted file and there is no iframe. Only youtube-nocookie.com is ever used.
 * States: poster, playing (iframe, focus moves to it), failed (poster returns with a "Watch on
 * YouTube" link, e.g. when an extension or the network blocks the frame).
 */
export default function VideoCard({
  videoId,
  title,
  duration,
  description,
  poster,
  headingLevel = 3,
}: {
  videoId: string;
  title: string;
  duration?: string;
  description?: string;
  /** Self-hosted poster (public/video-posters/...). Without it a labelled placeholder box is shown. */
  poster?: { src: string; srcSet?: string; width: number; height: number };
  headingLevel?: 2 | 3 | 4;
}) {
  const [phase, setPhase] = useState<Phase>("poster");
  const frameRef = useRef<HTMLIFrameElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (phase === "playing") {
      loaded.current = false;
      frameRef.current?.focus();
      const timer = window.setTimeout(() => {
        if (!loaded.current) setPhase("failed");
      }, LOAD_TIMEOUT_MS);
      return () => window.clearTimeout(timer);
    }
    // The frame is gone, so keyboard focus would be lost: put it back on the play control.
    if (phase === "failed") buttonRef.current?.focus();
  }, [phase]);

  if (!VIDEO_ID.test(videoId)) return null;

  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  return (
    <article className="al-video">
      <div className="al-video__frame">
        {phase === "playing" ? (
          <iframe
            ref={frameRef}
            className="al-video__iframe"
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
            title={title}
            sandbox={PLAYER_SANDBOX}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => {
              loaded.current = true;
            }}
            onError={() => setPhase("failed")}
          />
        ) : (
          <>
            {poster ? (
              <img
                className="al-video__poster"
                src={poster.src}
                srcSet={poster.srcSet}
                width={poster.width}
                height={poster.height}
                alt=""
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="al-video__poster al-video__poster--placeholder">
                <span>Poster image to come</span>
              </div>
            )}
            <button
              ref={buttonRef}
              type="button"
              className="al-video__play"
              aria-label={`Play video: ${title}`}
              onClick={() => setPhase("playing")}
            >
              <svg aria-hidden="true" width="28" height="28" viewBox="0 0 28 28" fill="currentColor">
                <path d="M9 5.5v17l14-8.5z" />
              </svg>
            </button>
          </>
        )}
      </div>
      <div className="al-video__meta">
        <Heading className="al-video__title">{title}</Heading>
        {duration ? <p className="al-video__duration">{duration}</p> : null}
        {description ? <p className="al-video__desc">{description}</p> : null}
        {phase === "failed" ? (
          <p className="al-video__fallback" role="status">
            The video did not load.{" "}
            <a href={watchUrl} target="_blank" rel="noreferrer">
              Watch on YouTube<span className="al-sr-only"> (opens in a new tab)</span>
            </a>
          </p>
        ) : null}
      </div>
    </article>
  );
}
