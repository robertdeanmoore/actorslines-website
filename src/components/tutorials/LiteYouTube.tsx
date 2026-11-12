import { useEffect, useRef, useState } from "react";
import "../../styles/lite-youtube.css";

/** Wording is Clarity's to approve (design spec 03 section 16). Shown once per video list, not per card. */
export const VIDEO_PRIVACY_NOTE = "Plays from YouTube when you press play. YouTube may then set cookies.";

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const LOAD_TIMEOUT_MS = 10000;

export function isValidVideoId(id: string): boolean {
  return VIDEO_ID.test(id);
}

export type VideoPoster = { src: string; srcSet?: string; width: number; height: number };

type Phase = "poster" | "playing" | "failed";

/**
 * Click-to-load YouTube video. Until the play button is pressed nothing is requested from YouTube:
 * the poster is a self-hosted file and there is no iframe (checklist item 18). Only
 * youtube-nocookie.com is ever used. States: poster, playing (iframe, focus moves to it), failed
 * (poster returns with a "Watch on YouTube" link, e.g. when an extension or the network blocks the frame).
 */
export default function LiteYouTube({
  videoId,
  title,
  poster,
}: {
  videoId: string;
  title: string;
  /** Self-hosted poster under public/video-posters/. Without it a labelled placeholder box is shown. */
  poster?: VideoPoster;
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

  if (!isValidVideoId(videoId)) return null;

  return (
    <div className="al-lite">
      <div className="al-lite__frame">
        {phase === "playing" ? (
          <iframe
            ref={frameRef}
            className="al-lite__iframe"
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
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
                className="al-lite__poster"
                src={poster.src}
                srcSet={poster.srcSet}
                width={poster.width}
                height={poster.height}
                alt=""
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="al-lite__poster al-lite__poster--placeholder">
                <span>Poster image to come</span>
              </div>
            )}
            <button
              ref={buttonRef}
              type="button"
              className="al-lite__play"
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
      {phase === "failed" ? (
        <p className="al-lite__fallback" role="status">
          The video did not load.{" "}
          <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noreferrer">
            Watch on YouTube<span className="al-lite__sr"> (opens in a new tab)</span>
          </a>
        </p>
      ) : null}
    </div>
  );
}
