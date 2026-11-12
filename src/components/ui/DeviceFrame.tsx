import type { ReactNode } from "react";

type Shot = {
  src: string;
  srcSet?: string;
  sizes?: string;
  /** Natural pixel size of the file: the browser reserves the box and the ratio is never forced (LL0064). */
  width: number;
  height: number;
  /** Says what the screen shows ("Actors Lines Practice screen in the Light Paper theme, ..."). Empty only for a decorative duplicate. */
  alt: string;
};

/**
 * Phone bezel around a light-paper app screenshot (design spec 03 section 7b): dark bezel as the
 * transition from night to paper, copper glow, crisp screen edge. The screenshot is never dimmed,
 * tinted, inverted or cropped. Without `shot` the same bezel shows the labelled placeholder.
 */
export default function DeviceFrame({ shot, caption }: { shot?: Shot; caption?: ReactNode }) {
  return (
    <figure className="al-device">
      <div className="al-device__bezel">
        {shot ? (
          <img
            className="al-device__shot"
            src={shot.src}
            srcSet={shot.srcSet}
            sizes={shot.sizes}
            width={shot.width}
            height={shot.height}
            alt={shot.alt}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="al-device__screen" data-surface="paper">
            <p className="al-device__title">App screenshot to come</p>
            <p className="al-device__note">Light Paper theme, portrait</p>
          </div>
        )}
      </div>
      {caption ? <figcaption className="al-device__caption">{caption}</figcaption> : null}
    </figure>
  );
}
