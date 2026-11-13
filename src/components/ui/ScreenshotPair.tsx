import DeviceFrame from "./DeviceFrame";

const SIZES = "(min-width: 48rem) 20rem, min(18.75rem, 78vw)";
const DIR = "/app-screenshots";

// Natural size of the 864w files (cropped to 864x1829); the 540w file is the same ratio (LL0064).
export const editShot = {
  src: `${DIR}/al-edit-864.webp`,
  srcSet: `${DIR}/al-edit-540.webp 540w, ${DIR}/al-edit-864.webp 864w`,
  sizes: SIZES,
  width: 864,
  height: 1829,
  alt: "Phone screen of the Actors Lines Edit view in the Light Paper theme: the script of Act 1, Scene 2 as plain text, each line with a clock icon and drag handle, a search bar, and a bottom toolbar of Sound, Light, Stage, Skip, Page and Line.",
};

export const practiceShot = {
  src: `${DIR}/al-practice-864.webp`,
  srcSet: `${DIR}/al-practice-540.webp 540w, ${DIR}/al-practice-864.webp 864w`,
  sizes: SIZES,
  width: 864,
  height: 1829,
  alt: "Phone screen of the Actors Lines Practice view in the Light Paper theme: the same scene with some words blanked out as underlines, mode tabs Notes, All, Blank, Word and Random, a counter reading Total 14, Hidden 4, Ratio 28%, and a Run this scene button.",
};

// Captions: Clarity-approved text (Screenshots Copy Review 2026-11-13). Android screens only.
/** Edit and Practice screens side by side (stacked on a phone). Night look only. */
export default function ScreenshotPair() {
  return (
    <div className="al-shots">
      <DeviceFrame
        shot={editShot}
        caption={
          <>
            <span className="al-device__caption-title">Edit: build your script.</span>
            Check your script text, add sound, light and stage cues, and skip or page-mark lines.
          </>
        }
      />
      <DeviceFrame
        shot={practiceShot}
        caption={
          <>
            <span className="al-device__caption-title">Practice: hide lines, recall them.</span>
            Hide words or whole lines, then say them from memory. You choose how much is hidden, and it can
            differ from line to line. The app shows the count.
          </>
        }
      />
    </div>
  );
}
